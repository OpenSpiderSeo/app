package crawl

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
	"github.com/openspider/openspider/internal/issues"
	"github.com/openspider/openspider/internal/types"
	"github.com/openspider/openspider/internal/urlutil"
)

const (
	defaultOutboundMaxLinks = 500
	defaultOutboundConcurrency = 8
)

type OutboundCheckInput struct {
	ExternalOnly           bool `json:"externalOnly"`
	IncludeInternalUncrawled bool `json:"includeInternalUncrawled"`
	MaxLinks               int  `json:"maxLinks"`
	Concurrency            int  `json:"concurrency"`
	UserAgent              string `json:"userAgent"`
	RequestTimeoutMs       int  `json:"requestTimeoutMs"`
}

type OutboundBrokenSource struct {
	URL    string  `json:"url"`
	Anchor *string `json:"anchor,omitempty"`
}

type OutboundBrokenRow struct {
	TargetURL  string                 `json:"targetUrl"`
	StatusCode int                    `json:"statusCode"`
	Error      *string                `json:"error,omitempty"`
	Sources    []OutboundBrokenSource `json:"sources"`
}

type OutboundCheckResult struct {
	Broken      []OutboundBrokenRow `json:"broken"`
	Checked     int                 `json:"checked"`
	Skipped     int                 `json:"skipped"`
	IssuesAdded int                 `json:"issuesAdded"`
	Error       *string             `json:"error,omitempty"`
}

type collectedLink struct {
	targetURL string
	sourceURL string
	anchor    string
}

func isCheckableHref(raw string) bool {
	lower := strings.TrimSpace(strings.ToLower(raw))
	if lower == "" || strings.HasPrefix(lower, "#") {
		return false
	}
	for _, p := range []string{"mailto:", "tel:", "javascript:", "data:"} {
		if strings.HasPrefix(lower, p) {
			return false
		}
	}
	return true
}

func collectOutboundLinks(storedHTML map[string]string, pages []types.CrawledPage, startURL string, input OutboundCheckInput) []collectedLink {
	externalOnly := input.ExternalOnly
	if !input.ExternalOnly && !input.IncludeInternalUncrawled {
		externalOnly = true
	}
	includeInternal := input.IncludeInternalUncrawled
	startOrigin := urlutil.OriginOf(startURL)
	if startOrigin == "" && len(pages) > 0 {
		startOrigin = urlutil.OriginOf(pages[0].URL)
	}

	var out []collectedLink
	for sourceURL, html := range storedHTML {
		doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
		if err != nil {
			continue
		}
		doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
			hrefRaw, ok := s.Attr("href")
			if !ok || !isCheckableHref(hrefRaw) {
				return
			}
			targetURL := urlutil.NormalizeURL(strings.TrimSpace(hrefRaw), sourceURL)
			if targetURL == "" {
				return
			}
			isInternal := startOrigin != "" && urlutil.SameOrigin(targetURL, startOrigin)
			if isInternal {
				if !includeInternal {
					return
				}
			} else if !externalOnly {
				return
			}
			anchor := regexp.MustCompile(`\s+`).ReplaceAllString(strings.TrimSpace(s.Text()), " ")
			if len(anchor) > 120 {
				anchor = anchor[:120]
			}
			out = append(out, collectedLink{targetURL: targetURL, sourceURL: sourceURL, anchor: anchor})
		})
	}
	return out
}

func fetchLinkStatus(ctx context.Context, client *http.Client, url, userAgent string) (int, *string) {
	req, err := http.NewRequestWithContext(ctx, http.MethodHead, url, nil)
	if err != nil {
		msg := err.Error()
		return 0, &msg
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
	resp, err := client.Do(req)
	if err != nil {
		msg := err.Error()
		return 0, &msg
	}
	resp.Body.Close()
	if resp.StatusCode == 405 || resp.StatusCode == 501 {
		req2, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		req2.Header = req.Header
		resp2, err2 := client.Do(req2)
		if err2 != nil {
			msg := err2.Error()
			return 0, &msg
		}
		resp2.Body.Close()
		return resp2.StatusCode, nil
	}
	return resp.StatusCode, nil
}

func isBrokenStatus(code int) bool {
	return code == 0 || code >= 400
}

func CheckOutboundLinks(storedHTML map[string]string, pages []types.CrawledPage, startURL string, input OutboundCheckInput) (OutboundCheckResult, []types.SeoIssue) {
	if len(storedHTML) == 0 {
		msg := "No stored HTML — crawl with Store HTML enabled"
		return OutboundCheckResult{Error: &msg}, nil
	}

	maxLinks := input.MaxLinks
	if maxLinks <= 0 {
		maxLinks = defaultOutboundMaxLinks
	}
	concurrency := input.Concurrency
	if concurrency <= 0 {
		concurrency = defaultOutboundConcurrency
	}
	timeoutMs := input.RequestTimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = defaultTimeoutMs
	}
	userAgent := input.UserAgent
	if userAgent == "" {
		userAgent = DefaultUserAgent
	}

	collected := collectOutboundLinks(storedHTML, pages, startURL, input)
	byTarget := map[string][]collectedLink{}
	for _, link := range collected {
		byTarget[link.targetURL] = append(byTarget[link.targetURL], link)
	}

	targets := make([]string, 0, len(byTarget))
	for t := range byTarget {
		targets = append(targets, t)
	}
	if len(targets) > maxLinks {
		targets = targets[:maxLinks]
	}

	pageByURL := map[string]types.CrawledPage{}
	for _, p := range pages {
		pageByURL[p.URL] = p
	}

	statusCache := map[string]struct {
		code  int
		err   *string
	}{}
	skipped := 0
	for _, target := range targets {
		if p, ok := pageByURL[target]; ok {
			statusCache[target] = struct {
				code int
				err  *string
			}{code: p.StatusCode, err: p.Error}
			skipped++
		}
	}

	var toFetch []string
	for _, t := range targets {
		if _, ok := statusCache[t]; !ok {
			toFetch = append(toFetch, t)
		}
	}

	client := NewHTTPClient(timeoutMs)
	ctx := context.Background()
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, target := range toFetch {
		wg.Add(1)
		go func(u string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			code, errMsg := fetchLinkStatus(ctx, client, u, userAgent)
			mu.Lock()
			statusCache[u] = struct {
				code int
				err  *string
			}{code: code, err: errMsg}
			mu.Unlock()
		}(target)
	}
	wg.Wait()

	var broken []OutboundBrokenRow
	var issueList []types.SeoIssue

	for _, target := range targets {
		st, ok := statusCache[target]
		if !ok || !isBrokenStatus(st.code) {
			continue
		}
		sources := byTarget[target]
		var srcRows []OutboundBrokenSource
		for _, s := range sources {
			var anchor *string
			if s.anchor != "" {
				a := s.anchor
				anchor = &a
			}
			srcRows = append(srcRows, OutboundBrokenSource{URL: s.sourceURL, Anchor: anchor})
			issueList = append(issueList, buildOutboundIssue(s.sourceURL, target, st.code, s.anchor, st.err))
		}
		broken = append(broken, OutboundBrokenRow{
			TargetURL:  target,
			StatusCode: st.code,
			Error:      st.err,
			Sources:    srcRows,
		})
	}

	return OutboundCheckResult{
		Broken:      broken,
		Checked:     len(toFetch),
		Skipped:     skipped,
		IssuesAdded: len(issueList),
	}, issueList
}

func buildOutboundIssue(sourceURL, targetURL string, statusCode int, anchor string, fetchErr *string) types.SeoIssue {
	statusLabel := "failed"
	if statusCode != 0 {
		statusLabel = itoa(statusCode)
	}
	evidence := map[string]interface{}{
		"kind":       "outbound_broken",
		"targetUrl":  targetURL,
		"statusCode": statusCode,
	}
	if anchor != "" {
		evidence["anchor"] = anchor
	}
	if fetchErr != nil {
		evidence["fetchError"] = *fetchErr
	}
	return types.SeoIssue{
		ID:       issues.CodeOutboundBroken + "::" + sourceURL + "::" + targetURL,
		Code:     issues.CodeOutboundBroken,
		Severity: types.SeverityError,
		URL:      sourceURL,
		Domain:   issues.DomainLinks,
		Message:  "Broken outbound link (" + statusLabel + "): " + targetURL,
		Evidence: evidence,
	}
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var digits []byte
	for n > 0 {
		digits = append([]byte{byte('0' + n%10)}, digits...)
		n /= 10
	}
	if neg {
		return "-" + string(digits)
	}
	return string(digits)
}
