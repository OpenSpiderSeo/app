package types

import "time"

const (
	CrawlIdle     = "idle"
	CrawlRunning  = "running"
	CrawlPausing  = "pausing"
	CrawlPaused   = "paused"
	CrawlStopping = "stopping"
	CrawlFinished = "finished"
	CrawlError    = "error"
)

const (
	SeverityError   = "error"
	SeverityWarning = "warning"
	SeverityInfo    = "info"
)

type HreflangRef struct {
	Lang string `json:"lang"`
	Href string `json:"href"`
}

type LocalNapEntryEvidence struct {
	SchemaType   string  `json:"schemaType"`
	HasTelephone bool    `json:"hasTelephone"`
	HasAddress   bool    `json:"hasAddress"`
	HasName      bool    `json:"hasName"`
	BusinessName *string `json:"businessName,omitempty"`
}

type CrawlOptions struct {
	StartURL         string   `json:"startUrl"`
	MaxConcurrency   int      `json:"maxConcurrency,omitempty"`
	RequestTimeoutMs int      `json:"requestTimeoutMs,omitempty"`
	UserAgent        string   `json:"userAgent,omitempty"`
	MaxDepth         int      `json:"maxDepth,omitempty"`
	SameOriginOnly   bool     `json:"sameOriginOnly,omitempty"`
	MaxURLs          int      `json:"maxUrls,omitempty"`
	FollowLinks      bool     `json:"followLinks,omitempty"`
	RespectRobotsTxt bool     `json:"respectRobotsTxt,omitempty"`
	SeedFromSitemap  bool     `json:"seedFromSitemap,omitempty"`
	StoreHTML        bool     `json:"storeHtml,omitempty"`
	RenderJs         bool     `json:"renderJs,omitempty"`
	ListMode         bool     `json:"listMode,omitempty"`
	ForceRecrawl     bool     `json:"forceRecrawl,omitempty"`
	URLList          []string `json:"urlList,omitempty"`
}

type CrawlProgress struct {
	Status        string  `json:"status"`
	Queued        int     `json:"queued"`
	Fetched       int     `json:"fetched"`
	Errors        int     `json:"errors"`
	MaxURLs       int     `json:"maxUrls,omitempty"`
	MaxDepth      int     `json:"maxDepth,omitempty"`
	IssueCount    int     `json:"issueCount,omitempty"`
	IssueErrors   int     `json:"issueErrors,omitempty"`
	IssueWarnings int     `json:"issueWarnings,omitempty"`
	StartedAt     *string `json:"startedAt"`
	FinishedAt    *string `json:"finishedAt"`
	StartURL      *string `json:"startUrl"`
}

type CrawledPage struct {
	URL                        string                  `json:"url"`
	Segment                    *string                 `json:"segment,omitempty"`
	StatusCode                 int                     `json:"statusCode"`
	ContentType                *string                 `json:"contentType"`
	Title                      *string                 `json:"title"`
	MetaDescriptionOnly        *string                 `json:"metaDescriptionOnly"`
	MetaDescription            *string                 `json:"metaDescription"`
	H1                         []string                `json:"h1"`
	H2Count                    int                     `json:"h2Count"`
	Canonical                  *string                 `json:"canonical"`
	RobotsMeta                 *string                 `json:"robotsMeta"`
	OgTitle                    *string                 `json:"ogTitle"`
	OgTitleOnly                *string                 `json:"ogTitleOnly"`
	OgImage                    *string                 `json:"ogImage"`
	OgImageOnly                *string                 `json:"ogImageOnly"`
	TwitterImage               *string                 `json:"twitterImage"`
	TwitterCard                *string                 `json:"twitterCard"`
	WordCount                  int                     `json:"wordCount"`
	ImagesTotal                int                     `json:"imagesTotal"`
	ImagesMissingAlt           int                     `json:"imagesMissingAlt"`
	ButtonsWithoutName         int                     `json:"buttonsWithoutName"`
	LinksWithoutAccessibleName int                     `json:"linksWithoutAccessibleName"`
	HasSkipLink                bool                    `json:"hasSkipLink"`
	JsonLdCount                int                     `json:"jsonLdCount"`
	JsonLdTypes                []string                `json:"jsonLdTypes"`
	JsonLdInvalid              bool                    `json:"jsonLdInvalid"`
	JsonLdLocalNapIncomplete   bool                    `json:"jsonLdLocalNapIncomplete"`
	JsonLdLocalNapEvidence     []LocalNapEntryEvidence `json:"jsonLdLocalNapEvidence"`
	HasViewport                bool                    `json:"hasViewport"`
	HTMLLang                   *string                 `json:"htmlLang"`
	Hreflang                   []HreflangRef           `json:"hreflang"`
	Language                   *string                 `json:"language"`
	ReadingTimeMin             int                     `json:"readingTimeMin"`
	Excerpt                    *string                 `json:"excerpt"`
	TopKeywords                []string                `json:"topKeywords"`
	ContentFingerprint         *string                 `json:"contentFingerprint"`
	ExactContentHash           *string                 `json:"exactContentHash"`
	Rendered                   bool                    `json:"rendered"`
	Depth                      int                     `json:"depth"`
	Inlinks                    int                     `json:"inlinks"`
	Outlinks                   int                     `json:"outlinks"`
	RedirectURL                *string                 `json:"redirectUrl"`
	FetchedAt                  string                  `json:"fetchedAt"`
	Error                      *string                 `json:"error"`
}

type SeoIssue struct {
	ID       string      `json:"id"`
	Code     string      `json:"code"`
	Severity string      `json:"severity"`
	URL      string      `json:"url"`
	Message  string      `json:"message"`
	Domain   string      `json:"domain,omitempty"`
	Evidence interface{} `json:"evidence,omitempty"`
}

type CrawlState struct {
	Progress CrawlProgress `json:"progress"`
	Pages    []CrawledPage `json:"pages"`
	Issues   []SeoIssue    `json:"issues"`
}

type CrawlEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type AppInfo struct {
	Name             string `json:"name"`
	Version          string `json:"version"`
	Platform         string `json:"platform"`
	Engine           string `json:"engine"`
	UpdatesSupported bool   `json:"updatesSupported"`
}

type SystemLoadSnapshot struct {
	CPUPercent    float64 `json:"cpuPercent"`
	RAMUsedBytes  uint64  `json:"ramUsedBytes"`
	RAMTotalBytes uint64  `json:"ramTotalBytes"`
	RAMPercent    float64 `json:"ramPercent"`
	SampledAt     string  `json:"sampledAt"`
}

type IntegrationSecrets struct {
	PSIApiKey         *string `json:"psiApiKey,omitempty"`
	MetrikaCounterID  *string `json:"metrikaCounterId,omitempty"`
	MetrikaOauthToken *string `json:"metrikaOauthToken,omitempty"`
	GscSiteURL        *string `json:"gscSiteUrl,omitempty"`
	OpenaiApiKey      *string `json:"openaiApiKey,omitempty"`
	OpenaiBaseURL     *string `json:"openaiBaseUrl,omitempty"`
	IndexNowKey       *string `json:"indexNowKey,omitempty"`
}

func NowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}
