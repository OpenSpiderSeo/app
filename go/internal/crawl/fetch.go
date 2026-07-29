package crawl

import (
	"context"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/urlutil"
)

type FetchResult struct {
	StatusCode  int
	ContentType *string
	Body        string
	RedirectURL *string
	Error       *string
}

func FetchPage(ctx context.Context, client *http.Client, pageURL, userAgent string) FetchResult {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, pageURL, nil)
	if err != nil {
		msg := err.Error()
		return FetchResult{StatusCode: 0, Error: &msg}
	}
	if userAgent != "" {
		req.Header.Set("User-Agent", userAgent)
	} else {
		req.Header.Set("User-Agent", "OpenSpider/0.11 (+https://github.com/OpenSpiderSeo/app)")
	}
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		msg := err.Error()
		return FetchResult{StatusCode: 0, Error: &msg}
	}
	defer resp.Body.Close()

	// Do not auto-follow: keep the requested URL as the crawl node and record Location.
	redirect := (*string)(nil)
	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		if loc := strings.TrimSpace(resp.Header.Get("Location")); loc != "" {
			if n := urlutil.NormalizeURL(loc, pageURL); n != "" {
				redirect = &n
			}
		}
	}

	ct := resp.Header.Get("Content-Type")
	var contentType *string
	if ct != "" {
		parts := strings.Split(ct, ";")
		ct = strings.TrimSpace(parts[0])
		contentType = &ct
	}

	const maxBody = 4 << 20 // 4MB
	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, maxBody))
	if err != nil {
		msg := err.Error()
		return FetchResult{StatusCode: resp.StatusCode, ContentType: contentType, RedirectURL: redirect, Error: &msg}
	}

	return FetchResult{
		StatusCode:  resp.StatusCode,
		ContentType: contentType,
		Body:        string(bodyBytes),
		RedirectURL: redirect,
	}
}

func NewHTTPClient(timeoutMs int) *http.Client {
	if timeoutMs <= 0 {
		timeoutMs = 15000
	}
	return &http.Client{
		Timeout: time.Duration(timeoutMs) * time.Millisecond,
		// Stop at the first redirect so the seed/start URL is not replaced by /en (locale) etc.
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func IsHTML(contentType *string) bool {
	if contentType == nil {
		return true
	}
	ct := strings.ToLower(*contentType)
	return strings.Contains(ct, "html") || strings.Contains(ct, "xhtml")
}
