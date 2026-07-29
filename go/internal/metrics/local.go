package metrics

import (
	"github.com/openspider/openspider/internal/types"
)

type Bucket struct {
	Label string `json:"label"`
	Count int    `json:"count"`
	Tone  string `json:"tone"`
}

type LocalMetricsSnapshot struct {
	Pages           int      `json:"pages"`
	Errors          int      `json:"errors"`
	Warnings        int      `json:"warnings"`
	Infos           int      `json:"infos"`
	Orphans         int      `json:"orphans"`
	AvgInlinks      float64  `json:"avgInlinks"`
	AvgDepth        float64  `json:"avgDepth"`
	IndexableShare  int      `json:"indexableShare"`
	WithTitle       int      `json:"withTitle"`
	WithDescription int      `json:"withDescription"`
	WithJsonLd      int      `json:"withJsonLd"`
	WithViewport    int      `json:"withViewport"`
	HealthScore     int      `json:"healthScore"`
	FixProgress     int      `json:"fixProgress"`
	Buckets         []Bucket `json:"buckets"`
}

func BuildLocalMetrics(state types.CrawlState) LocalMetricsSnapshot {
	pages := state.Pages
	issues := state.Issues

	errors, warnings, infos := 0, 0, 0
	for _, i := range issues {
		switch i.Severity {
		case types.SeverityError:
			errors++
		case types.SeverityWarning:
			warnings++
		case types.SeverityInfo:
			infos++
		}
	}

	orphans := 0
	var inlinkSum, depthSum float64
	indexable := 0
	withTitle, withDescription, withJsonLd, withViewport := 0, 0, 0, 0
	okPages := 0

	b2xx, b3xx, b4xx, b5xx, bErr := 0, 0, 0, 0, 0
	for _, p := range pages {
		if p.Inlinks == 0 && p.Depth > 0 {
			orphans++
		}
		inlinkSum += float64(p.Inlinks)
		depthSum += float64(p.Depth)

		if p.StatusCode >= 200 && p.StatusCode < 300 && !hasNoindex(p.RobotsMeta) {
			indexable++
		}
		if p.Title != nil && *p.Title != "" {
			withTitle++
		}
		if p.MetaDescription != nil && *p.MetaDescription != "" {
			withDescription++
		}
		if p.JsonLdCount > 0 {
			withJsonLd++
		}
		if p.HasViewport {
			withViewport++
		}
		if isOkHTML(p) {
			okPages++
		}

		switch {
		case p.Error != nil:
			bErr++
		case p.StatusCode >= 500:
			b5xx++
		case p.StatusCode >= 400:
			b4xx++
		case p.StatusCode >= 300:
			b3xx++
		case p.StatusCode >= 200:
			b2xx++
		}
	}

	n := len(pages)
	if n == 0 {
		n = 1
	}
	avgIn := 0.0
	avgDep := 0.0
	if len(pages) > 0 {
		avgIn = inlinkSum / float64(len(pages))
		avgDep = depthSum / float64(len(pages))
	}

	health := ComputeHealthScore(errors, warnings, okPages)
	fixProgress := ComputeFixProgress(issues)

	return LocalMetricsSnapshot{
		Pages:           len(pages),
		Errors:          errors,
		Warnings:        warnings,
		Infos:           infos,
		Orphans:         orphans,
		AvgInlinks:      round2(avgIn),
		AvgDepth:        round2(avgDep),
		IndexableShare:  int(float64(indexable)/float64(n)*100 + 0.5),
		WithTitle:       withTitle,
		WithDescription: withDescription,
		WithJsonLd:      withJsonLd,
		WithViewport:    withViewport,
		HealthScore:     health,
		FixProgress:     fixProgress,
		Buckets: []Bucket{
			{Label: "2xx", Count: b2xx, Tone: "ok"},
			{Label: "3xx", Count: b3xx, Tone: "info"},
			{Label: "4xx", Count: b4xx, Tone: "warn"},
			{Label: "5xx", Count: b5xx, Tone: "bad"},
			{Label: "ERR", Count: bErr, Tone: "bad"},
		},
	}
}

func hasNoindex(robots *string) bool {
	if robots == nil {
		return false
	}
	return indexFold(*robots, "noindex") >= 0
}

func round2(v float64) float64 {
	return float64(int(v*100+0.5)) / 100
}
