package audit

import "github.com/openspider/openspider/internal/metrics"

type LighthouseScores struct {
	URL             string  `json:"url"`
	Performance     *int    `json:"performance"`
	Accessibility   *int    `json:"accessibility"`
	BestPractices   *int    `json:"bestPractices"`
	Seo             *int    `json:"seo"`
	LcpMs           *int    `json:"lcpMs"`
	Cls             *float64 `json:"cls"`
	InpMs           *int    `json:"inpMs"`
	TtfbMs          *int    `json:"ttfbMs"`
	Source          string  `json:"source"`
	FetchedAt       string  `json:"fetchedAt"`
	Error           *string `json:"error,omitempty"`
	// ErrorCode: psi_rate_limited | psi_unavailable | psi_no_key — UI maps to i18n.
	ErrorCode       *string `json:"errorCode,omitempty"`
}

type SerpHit struct {
	Position int    `json:"position"`
	Title    string `json:"title"`
	URL      string `json:"url"`
	Snippet  string `json:"snippet"`
}

type SerpEngineResult struct {
	Engine        string    `json:"engine"`
	Query         string    `json:"query"`
	Kind          string    `json:"kind,omitempty"`
	Hits          []SerpHit `json:"hits"`
	DomainRank    *int      `json:"domainRank"`
	IndexedApprox *int      `json:"indexedApprox,omitempty"`
	Error         *string   `json:"error,omitempty"`
}

type SerpSiteEngineStat struct {
	Engine  string   `json:"engine"`
	HitCount int     `json:"hitCount"`
	TopURLs []string `json:"topUrls"`
	Error   *string  `json:"error,omitempty"`
}

type SerpReport struct {
	Domain    string             `json:"domain"`
	Keyword   string             `json:"keyword"`
	Engines   []SerpEngineResult `json:"engines"`
	SiteStats *SerpSiteStats     `json:"siteStats,omitempty"`
	FetchedAt string             `json:"fetchedAt"`
}

type SerpSiteStats struct {
	Domain         string               `json:"domain"`
	Engines        []SerpSiteEngineStat `json:"engines"`
	BestHitCount   int                  `json:"bestHitCount"`
	IndexedSignal  string               `json:"indexedSignal"`
}

type LlmsResult struct {
	OK         bool   `json:"ok"`
	Status     int    `json:"status"`
	URL        string `json:"url"`
}

type PagePreviewData struct {
	URL                string  `json:"url"`
	Domain             string  `json:"domain"`
	SerpTitle          string  `json:"serpTitle"`
	SerpDescription    string  `json:"serpDescription"`
	SocialTitle        string  `json:"socialTitle"`
	SocialDescription  string  `json:"socialDescription"`
	SocialImage        *string `json:"socialImage"`
	OgImage            *string `json:"ogImage"`
	TwitterImage       *string `json:"twitterImage"`
}

type AuditSection struct {
	ID     string   `json:"id"`
	Title  string   `json:"title"`
	Score  int      `json:"score"`
	Status string   `json:"status"`
	Notes  []string `json:"notes"`
}

type ShadowRiskSignal struct {
	ID     string                 `json:"id"`
	Weight int                    `json:"weight"`
	Params map[string]interface{} `json:"params,omitempty"`
}

type ShadowRiskAnalysis struct {
	Band       string             `json:"band"`
	RiskPoints int                `json:"riskPoints"`
	Signals    []ShadowRiskSignal `json:"signals"`
}

type ReportRecommendation struct {
	ID       string                 `json:"id"`
	Priority string                 `json:"priority"`
	Params   map[string]interface{} `json:"params,omitempty"`
}

type FullAuditResult struct {
	URL             string                      `json:"url"`
	Keyword         string                      `json:"keyword"`
	StartedAt       string                      `json:"startedAt"`
	FinishedAt      string                      `json:"finishedAt"`
	HealthScore     int                         `json:"healthScore"`
	Sections        []AuditSection              `json:"sections"`
	Lighthouse      *LighthouseScores           `json:"lighthouse"`
	Serp            *SerpReport                 `json:"serp"`
	Local           *metrics.LocalMetricsSnapshot `json:"local"`
	Llms            *LlmsResult                 `json:"llms"`
	Previews        []PagePreviewData           `json:"previews,omitempty"`
	ShadowRisk      *ShadowRiskAnalysis         `json:"shadowRisk,omitempty"`
	Recommendations []ReportRecommendation      `json:"recommendations,omitempty"`
}

type FullAuditInput struct {
	URL      string `json:"url"`
	Keyword  string `json:"keyword"`
	RunCrawl *bool  `json:"runCrawl"`
}
