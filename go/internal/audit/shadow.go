package audit

import "github.com/openspider/openspider/internal/metrics"

type ShadowInput struct {
	Serp           *SerpReport
	Local          *metrics.LocalMetricsSnapshot
	Llms           *LlmsResult
	ThinContentCnt int
	Errors         int
}

func AnalyzeShadowRisk(in ShadowInput) *ShadowRiskAnalysis {
	signals := []ShadowRiskSignal{}
	points := 0

	indexedSignal := "none"
	siteHits := 0
	if in.Serp != nil && in.Serp.SiteStats != nil {
		indexedSignal = in.Serp.SiteStats.IndexedSignal
		siteHits = in.Serp.SiteStats.BestHitCount
	}
	bestRank := (*int)(nil)
	if in.Serp != nil {
		bestRank = bestKeywordRank(in.Serp)
	}

	switch indexedSignal {
	case "none":
		pushSignal(&signals, &points, "indexed-none", 4, map[string]interface{}{"hits": siteHits})
	case "weak":
		pushSignal(&signals, &points, "indexed-weak", 2, map[string]interface{}{"hits": siteHits})
	}

	hasIndexFootprint := siteHits >= 1 || indexedSignal == "weak" || indexedSignal == "strong"
	if hasIndexFootprint && (bestRank == nil || *bestRank > 20) {
		rankVal := "—"
		if bestRank != nil {
			rankVal = fmtScore(*bestRank)
		}
		pushSignal(&signals, &points, "rank-missing-indexed", 2, map[string]interface{}{"rank": rankVal})
	}

	if in.Local != nil {
		httpErrs := 0
		for _, b := range in.Local.Buckets {
			if b.Label == "4xx" || b.Label == "5xx" || b.Label == "ERR" {
				httpErrs += b.Count
			}
		}
		if httpErrs >= 3 {
			pushSignal(&signals, &points, "high-http-errors", 2, map[string]interface{}{"count": httpErrs})
		}
		if in.Local.Orphans >= 5 {
			pushSignal(&signals, &points, "many-orphans", 1, map[string]interface{}{"count": in.Local.Orphans})
		}
	}

	if in.Errors >= 3 {
		pushSignal(&signals, &points, "crawl-errors", 2, map[string]interface{}{"count": in.Errors})
	}

	if in.ThinContentCnt >= 3 {
		pushSignal(&signals, &points, "thin-content", 1, map[string]interface{}{"count": in.ThinContentCnt})
	}

	if in.Llms != nil && !in.Llms.OK {
		pushSignal(&signals, &points, "llms-missing", 1, nil)
	}

	band := "none"
	if points >= 6 {
		band = "likely"
	} else if points >= 3 {
		band = "watch"
	}

	return &ShadowRiskAnalysis{
		Band:       band,
		RiskPoints: points,
		Signals:    signals,
	}
}

func pushSignal(signals *[]ShadowRiskSignal, points *int, id string, weight int, params map[string]interface{}) {
	*signals = append(*signals, ShadowRiskSignal{ID: id, Weight: weight, Params: params})
	*points += weight
}
