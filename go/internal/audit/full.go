package audit

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/crawl"
	issuepkg "github.com/openspider/openspider/internal/issues"
	"github.com/openspider/openspider/internal/metrics"
	"github.com/openspider/openspider/internal/types"
)

type Engine interface {
	GetState() types.CrawlState
	GetConfig() types.CrawlOptions
	Start(opts types.CrawlOptions) error
	WaitUntilDone(timeout time.Duration)
}

func RunFullAudit(engine Engine, input FullAuditInput, psiKey *string) FullAuditResult {
	startedAt := types.NowISO()
	pageURL := strings.TrimSpace(input.URL)
	keyword := strings.TrimSpace(input.Keyword)

	runCrawl := true
	if input.RunCrawl != nil {
		runCrawl = *input.RunCrawl
	}

	if runCrawl {
		state := engine.GetState()
		if state.Progress.Status != types.CrawlRunning {
			cfg := engine.GetConfig()
			opts := types.CrawlOptions{
				StartURL:         pageURL,
				MaxConcurrency:   cfg.MaxConcurrency,
				RequestTimeoutMs: cfg.RequestTimeoutMs,
				UserAgent:        cfg.UserAgent,
				MaxDepth:         crawl.MaxAllowedDepth,
				SameOriginOnly:   true,
				FollowLinks:      true,
				StoreHTML:        true,
				ForceRecrawl:     false,
			}
			if opts.MaxConcurrency <= 0 {
				opts.MaxConcurrency = 4
			}
			if opts.RequestTimeoutMs <= 0 {
				opts.RequestTimeoutMs = 15000
			}
			if opts.UserAgent == "" {
				opts.UserAgent = crawl.DefaultUserAgent
			}
			_ = engine.Start(opts)
			engine.WaitUntilDone(120 * time.Second)
		}
	}

	state := engine.GetState()
	local := metrics.BuildLocalMetrics(state)
	localCopy := local
	previewPages := pickPreviewPages(state.Pages, pageURL, 3)
	previews := make([]PagePreviewData, 0, len(previewPages))
	for _, p := range previewPages {
		previews = append(previews, buildPagePreview(p))
	}
	shareCov := measurePreviewCoverage(state.Pages)
	shareScore := 0
	if shareCov.total > 0 {
		shareScore = int(float64(shareCov.withOgTitle+shareCov.withOgImage+shareCov.withDescription) /
			float64(shareCov.total*3) * 100)
	}

	cfg := engine.GetConfig()
	userAgent := cfg.UserAgent
	if userAgent == "" {
		userAgent = crawl.DefaultUserAgent
	}

	origin := pageURL
	if u, err := url.Parse(pageURL); err == nil {
		origin = u.Scheme + "://" + u.Host
	}

	lighthouse := RunPagespeed(pageURL, psiKey, false)
	serp := AnalyzeSerp(pageURL, keyword, userAgent)
	llms := ProbeLlmsTxt(origin, userAgent)

	techScore := local.HealthScore
	perfScore := intVal(lighthouse.Performance)
	seoLh := intVal(lighthouse.Seo)
	a11yScore := intVal(lighthouse.Accessibility)
	if lighthouse.Error != nil && a11yScore == 0 && local.Pages > 0 {
		a11yScore = int(float64(local.WithViewport) / float64(maxInt(local.Pages, 1)) * 100)
	}

	bestRank := bestKeywordRank(&serp)
	siteBest := 0
	indexedSignal := "none"
	if serp.SiteStats != nil {
		siteBest = serp.SiteStats.BestHitCount
		indexedSignal = serp.SiteStats.IndexedSignal
	}
	siteBoost := 15
	switch indexedSignal {
	case "strong":
		siteBoost = 85
	case "weak":
		siteBoost = 55
	}
	visibilityScore := 0
	if bestRank == nil {
		visibilityScore = int(float64(siteBoost) * 0.7)
	} else if *bestRank <= 3 {
		visibilityScore = 95
	} else if *bestRank <= 10 {
		visibilityScore = 75
	} else if *bestRank <= 20 {
		visibilityScore = 55
	} else {
		visibilityScore = maxInt(30, siteBoost)
	}

	onPageScore := 0
	if local.Pages > 0 {
		onPageScore = int(float64(local.WithTitle+local.WithDescription+local.WithJsonLd) /
			float64(maxInt(local.Pages, 1)*3) * 100)
	}

	sections := []AuditSection{
		{
			ID: "technical", Title: "Technical crawl", Score: techScore, Status: sectionStatus(techScore),
			Notes: []string{
				fmt.Sprintf("%d pages · %d errors · %d warnings", local.Pages, local.Errors, local.Warnings),
				fmt.Sprintf("%d orphans · indexable %d%%", local.Orphans, local.IndexableShare),
			},
		},
		{
			ID: "performance", Title: "Lighthouse / PageSpeed", Score: perfScore,
			Status: perfSectionStatus(lighthouse.Error, perfScore),
			Notes:  perfNotes(lighthouse),
		},
		{
			ID: "onpage", Title: "On-page / schema", Score: onPageScore, Status: sectionStatus(onPageScore),
			Notes: []string{
				fmt.Sprintf("Title %d/%d", local.WithTitle, local.Pages),
				fmt.Sprintf("Description %d/%d", local.WithDescription, local.Pages),
				fmt.Sprintf("JSON-LD %d/%d", local.WithJsonLd, local.Pages),
				fmt.Sprintf("LH SEO category %s", fmtScore(seoLh)),
			},
		},
		{
			ID: "a11y", Title: "Accessibility", Score: a11yScore, Status: sectionStatus(a11yScore),
			Notes: []string{
				fmt.Sprintf("Viewport %d/%d", local.WithViewport, local.Pages),
				fmt.Sprintf("LH A11y %s", fmtScore(intVal(lighthouse.Accessibility))),
			},
		},
		{
			ID: "visibility", Title: "SERP visibility", Score: visibilityScore, Status: sectionStatus(visibilityScore),
			Notes: visibilityNotes(&serp, bestRank, siteBest, indexedSignal),
		},
		{
			ID: "geo", Title: "GEO / llms.txt",
			Score: geoScore(llms.OK), Status: geoStatus(llms.OK),
			Notes: []string{fmt.Sprintf("%s → %d", llms.URL, llms.Status)},
		},
		{
			ID: "share", Title: "Share previews", Score: shareScore, Status: sectionStatus(shareScore),
			Notes: shareNotes(shareCov, previews),
		},
	}

	healthScore := 0
	for _, s := range sections {
		healthScore += s.Score
	}
	healthScore = int(float64(healthScore)/float64(maxInt(len(sections), 1)) + 0.5)

	thinCount := countThinContentIssues(state.Issues)
	shadow := AnalyzeShadowRisk(ShadowInput{
		Serp:           &serp,
		Local:          &local,
		Llms:           llmsFromResult(llms),
		ThinContentCnt: thinCount,
		Errors:         local.Errors,
	})

	recs := BuildRecommendations(RecInput{
		Local:       &local,
		Serp:        &serp,
		Llms:        llmsFromResult(llms),
		Shadow:      shadow,
		ThinCount:   thinCount,
		Errors:      local.Errors,
		Warnings:    local.Warnings,
		HealthScore: healthScore,
	})

	kwOut := keyword
	if kwOut == "" {
		kwOut = serp.Keyword
	}

	lhCopy := lighthouse
	serpCopy := serp
	return FullAuditResult{
		URL:             pageURL,
		Keyword:         kwOut,
		StartedAt:       startedAt,
		FinishedAt:      types.NowISO(),
		HealthScore:     healthScore,
		Sections:        sections,
		Lighthouse:      &lhCopy,
		Serp:            &serpCopy,
		Local:           &localCopy,
		Llms:            llmsFromResult(llms),
		Previews:        previews,
		ShadowRisk:      shadow,
		Recommendations: recs,
	}
}

func sectionStatus(score int) string {
	if score >= 75 {
		return "pass"
	}
	if score >= 45 {
		return "warn"
	}
	return "fail"
}

func perfSectionStatus(err *string, score int) string {
	if err != nil {
		return "fail"
	}
	return sectionStatus(score)
}

func perfNotes(lh LighthouseScores) []string {
	if lh.Error != nil {
		return []string{*lh.Error}
	}
	return []string{
		fmt.Sprintf("Perf %s · SEO %s · A11y %s",
			fmtScore(intVal(lh.Performance)), fmtScore(intVal(lh.Seo)), fmtScore(intVal(lh.Accessibility))),
		fmt.Sprintf("LCP %s · CLS %s · TTFB %s", fmtMs(lh.LcpMs), fmtCls(lh.Cls), fmtMs(lh.TtfbMs)),
	}
}

func visibilityNotes(serp *SerpReport, bestRank *int, siteBest int, indexedSignal string) []string {
	notes := []string{}
	if bestRank != nil {
		notes = append(notes, fmt.Sprintf("Best rank for «%s»: #%d", serp.Keyword, *bestRank))
	} else {
		notes = append(notes, fmt.Sprintf("Domain not in top for «%s»", serp.Keyword))
	}
	notes = append(notes, fmt.Sprintf("site:%s → %d SERP hits (%s)", serp.Domain, siteBest, indexedSignal))
	for _, e := range serp.Engines {
		if e.Kind == "site" {
			continue
		}
		line := e.Engine + ": "
		if e.DomainRank != nil {
			line += "#" + strconv.Itoa(*e.DomainRank)
		} else if len(e.Hits) > 0 {
			line += "not in top"
		} else {
			line += "0 hits"
		}
		line += fmt.Sprintf(" (%d)", len(e.Hits))
		notes = append(notes, line)
	}
	return notes
}

func shareNotes(cov previewCoverage, previews []PagePreviewData) []string {
	notes := []string{
		fmt.Sprintf("OG title %d/%d", cov.withOgTitle, cov.total),
		fmt.Sprintf("OG image %d/%d", cov.withOgImage, cov.total),
		fmt.Sprintf("Description %d/%d", cov.withDescription, cov.total),
	}
	if len(previews) > 0 {
		title := previews[0].SocialTitle
		if len(title) > 48 {
			title = title[:48]
		}
		notes = append(notes, "Start URL: «"+title+"»")
	} else {
		notes = append(notes, "No crawled pages for preview")
	}
	return notes
}

func geoScore(ok bool) int {
	if ok {
		return 90
	}
	return 25
}

func geoStatus(ok bool) string {
	if ok {
		return "pass"
	}
	return "warn"
}

func bestKeywordRank(serp *SerpReport) *int {
	var ranks []int
	for _, e := range serp.Engines {
		if e.Kind == "site" {
			continue
		}
		if e.DomainRank != nil {
			ranks = append(ranks, *e.DomainRank)
		}
	}
	if len(ranks) == 0 {
		return nil
	}
	min := ranks[0]
	for _, r := range ranks[1:] {
		if r < min {
			min = r
		}
	}
	return &min
}

func countThinContentIssues(list []types.SeoIssue) int {
	n := 0
	for _, i := range list {
		if i.Code == issuepkg.CodeThinContent {
			n++
		}
	}
	return n
}

func fmtScore(n int) string {
	if n == 0 {
		return "—"
	}
	return strconv.Itoa(n)
}

func fmtMs(p *int) string {
	if p == nil {
		return "—"
	}
	return strconv.Itoa(*p)
}

func fmtCls(p *float64) string {
	if p == nil {
		return "—"
	}
	return strconv.FormatFloat(*p, 'f', 3, 64)
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
