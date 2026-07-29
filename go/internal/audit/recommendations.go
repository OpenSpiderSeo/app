package audit

import "github.com/openspider/openspider/internal/metrics"

type RecInput struct {
	Local       *metrics.LocalMetricsSnapshot
	Serp        *SerpReport
	Llms        *LlmsResult
	Shadow      *ShadowRiskAnalysis
	ThinCount   int
	Errors      int
	Warnings    int
	HealthScore int
}

func BuildRecommendations(in RecInput) []ReportRecommendation {
	recs := []ReportRecommendation{}

	if in.Errors > 0 {
		pushRec(&recs, "fix-blocking-errors", "high", map[string]interface{}{"count": in.Errors})
	}

	indexedSignal := "none"
	if in.Serp != nil && in.Serp.SiteStats != nil {
		indexedSignal = in.Serp.SiteStats.IndexedSignal
	}
	if indexedSignal == "none" || indexedSignal == "weak" {
		pushRec(&recs, "restore-indexation", "high", map[string]interface{}{"signal": indexedSignal})
	}

	if in.Local != nil && in.Local.Orphans >= 3 {
		pushRec(&recs, "link-orphans", "medium", map[string]interface{}{"count": in.Local.Orphans})
	}

	if in.ThinCount > 0 {
		priority := "medium"
		if in.ThinCount >= 5 {
			priority = "high"
		}
		pushRec(&recs, "expand-thin-content", priority, map[string]interface{}{"count": in.ThinCount})
	}

	if in.Llms != nil && !in.Llms.OK {
		pushRec(&recs, "add-llms-txt", "low", nil)
	}

	if in.Shadow != nil {
		switch in.Shadow.Band {
		case "watch":
			pushRec(&recs, "shadow-watch", "medium", map[string]interface{}{"points": in.Shadow.RiskPoints})
		case "likely":
			pushRec(&recs, "shadow-likely", "high", map[string]interface{}{"points": in.Shadow.RiskPoints})
		}
	}

	if in.Warnings > 0 && in.Errors == 0 {
		pushRec(&recs, "fix-top-issues", "medium", map[string]interface{}{"count": in.Warnings})
	}

	return recs
}

func pushRec(list *[]ReportRecommendation, id, priority string, params map[string]interface{}) {
	for _, r := range *list {
		if r.ID == id {
			return
		}
	}
	*list = append(*list, ReportRecommendation{ID: id, Priority: priority, Params: params})
}
