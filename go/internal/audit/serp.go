package audit

import (
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/openspider/openspider/internal/types"
)

var serpClient = &http.Client{Timeout: 25 * time.Second}

func AnalyzeSerp(pageURL, keyword, userAgent string) SerpReport {
	domain := extractDomain(pageURL)
	kw := strings.TrimSpace(keyword)
	if kw == "" {
		kw = domain
	}
	fetchedAt := types.NowISO()

	engines := []SerpEngineResult{
		searchDuckDuckGo(kw, domain, userAgent, "keyword"),
		searchDuckDuckGo("site:"+domain, domain, userAgent, "site"),
	}

	siteStats := buildSiteStats(domain, engines)
	return SerpReport{
		Domain:    domain,
		Keyword:   kw,
		Engines:   engines,
		SiteStats: siteStats,
		FetchedAt: fetchedAt,
	}
}

func searchDuckDuckGo(query, domain, userAgent, kind string) SerpEngineResult {
	result := SerpEngineResult{
		Engine: "duckduckgo",
		Query:  query,
		Kind:   kind,
		Hits:   []SerpHit{},
	}
	if userAgent == "" {
		userAgent = "OpenSpider/1.0"
	}

	form := url.Values{}
	form.Set("q", query)
	req, err := http.NewRequest(http.MethodPost, "https://html.duckduckgo.com/html/", strings.NewReader(form.Encode()))
	if err != nil {
		msg := err.Error()
		result.Error = &msg
		return result
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := serpClient.Do(req)
	if err != nil {
		msg := err.Error()
		result.Error = &msg
		return result
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		msg := fmt.Sprintf("DuckDuckGo HTTP %d", res.StatusCode)
		result.Error = &msg
		return result
	}

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		msg := "parse error: " + err.Error()
		result.Error = &msg
		return result
	}

	hits := parseDDGHits(doc)
	result.Hits = hits
	if kind == "keyword" {
		rank := rankForDomain(hits, domain)
		result.DomainRank = rank
	} else {
		count := len(hits)
		result.IndexedApprox = &count
	}
	return result
}

func parseDDGHits(doc *goquery.Document) []SerpHit {
	var hits []SerpHit
	seen := map[string]struct{}{}

	addHit := func(title, href, snippet string) {
		href = normalizeHitURL(href)
		if href == "" || !strings.HasPrefix(href, "http") {
			return
		}
		title = collapseSpace(title)
		if title == "" {
			return
		}
		if _, dup := seen[href]; dup {
			return
		}
		seen[href] = struct{}{}
		hits = append(hits, SerpHit{
			Position: len(hits) + 1,
			Title:    title,
			URL:      href,
			Snippet:  collapseSpace(snippet),
		})
	}

	doc.Find(".result, .web-result, .links_main, article[data-testid=\"result\"]").Each(func(_ int, sel *goquery.Selection) {
		a := sel.Find("a.result__a, a[data-testid=\"result-title-a\"], h2 a, a.result__url").First()
		href, _ := a.Attr("href")
		if href == "" {
			href = sel.Find("a[href^=\"http\"]").First().AttrOr("href", "")
		}
		title := strings.TrimSpace(a.Text())
		if title == "" {
			title = sel.Find("h2").First().Text()
		}
		snippet := sel.Find(".result__snippet, .result-snippet, [data-result=\"snippet\"]").First().Text()
		addHit(title, href, snippet)
	})

	if len(hits) == 0 {
		doc.Find("a.result__a").Each(func(_ int, sel *goquery.Selection) {
			href, _ := sel.Attr("href")
			addHit(sel.Text(), href, "")
		})
	}
	return hits
}

func buildSiteStats(domain string, engines []SerpEngineResult) *SerpSiteStats {
	stats := &SerpSiteStats{
		Domain:        domain,
		Engines:       []SerpSiteEngineStat{},
		BestHitCount:  0,
		IndexedSignal: "none",
	}
	for _, e := range engines {
		if e.Kind != "site" {
			continue
		}
		top := []string{}
		for i, h := range e.Hits {
			if i >= 5 {
				break
			}
			top = append(top, h.URL)
		}
		stat := SerpSiteEngineStat{
			Engine:   e.Engine,
			HitCount: len(e.Hits),
			TopURLs:  top,
			Error:    e.Error,
		}
		stats.Engines = append(stats.Engines, stat)
		if len(e.Hits) > stats.BestHitCount {
			stats.BestHitCount = len(e.Hits)
		}
	}
	switch {
	case stats.BestHitCount >= 5:
		stats.IndexedSignal = "strong"
	case stats.BestHitCount >= 1:
		stats.IndexedSignal = "weak"
	default:
		stats.IndexedSignal = "none"
	}
	return stats
}

func rankForDomain(hits []SerpHit, domain string) *int {
	target := strings.TrimPrefix(strings.ToLower(domain), "www.")
	for _, h := range hits {
		host := extractDomain(h.URL)
		if host == target || strings.HasSuffix(host, "."+target) {
			r := h.Position
			return &r
		}
		blob := strings.ToLower(h.Title + " " + h.Snippet + " " + h.URL)
		if strings.Contains(blob, target) {
			r := h.Position
			return &r
		}
	}
	return nil
}

func extractDomain(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return strings.TrimPrefix(strings.ToLower(raw), "www.")
	}
	return strings.TrimPrefix(strings.ToLower(u.Hostname()), "www.")
}

var ddgRedirect = regexp.MustCompile(`uddg=([^&]+)`)

func normalizeHitURL(href string) string {
	href = strings.TrimSpace(href)
	if href == "" {
		return ""
	}
	if strings.Contains(href, "uddg=") {
		if m := ddgRedirect.FindStringSubmatch(href); len(m) == 2 {
			if decoded, err := url.QueryUnescape(m[1]); err == nil {
				href = decoded
			}
		}
	}
	u, err := url.Parse(href)
	if err != nil {
		return href
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return ""
	}
	return u.String()
}

func collapseSpace(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
