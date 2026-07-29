package audit

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/types"
)

const psiUserAgent = "OpenSpider/1.0 (+https://github.com/OpenSpiderSeo/app)"

func FetchPagespeedScores(pageURL string, apiKey *string) LighthouseScores {
	fetchedAt := types.NowISO()
	out := LighthouseScores{
		URL:       pageURL,
		Source:    "pagespeed",
		FetchedAt: fetchedAt,
	}

	endpoint, err := url.Parse("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")
	if err != nil {
		msg := err.Error()
		out.Error = &msg
		return out
	}
	q := endpoint.Query()
	q.Set("url", pageURL)
	q.Set("strategy", "mobile")
	for _, cat := range []string{"PERFORMANCE", "ACCESSIBILITY", "BEST_PRACTICES", "SEO"} {
		q.Add("category", cat)
	}
	if apiKey != nil && strings.TrimSpace(*apiKey) != "" {
		q.Set("key", strings.TrimSpace(*apiKey))
	}
	endpoint.RawQuery = q.Encode()

	client := &http.Client{Timeout: 90 * time.Second}
	req, _ := http.NewRequest(http.MethodGet, endpoint.String(), nil)
	req.Header.Set("User-Agent", psiUserAgent)

	res, err := client.Do(req)
	if err != nil {
		msg := err.Error()
		out.Error = &msg
		return out
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 4<<20))

	if res.StatusCode != http.StatusOK {
		msg, code := psiHTTPError(res.StatusCode, string(body), apiKey)
		out.Error = &msg
		out.ErrorCode = &code
		return out
	}

	var parsed struct {
		LighthouseResult struct {
			Categories map[string]struct {
				Score *float64 `json:"score"`
			} `json:"categories"`
			Audits map[string]struct {
				NumericValue *float64 `json:"numericValue"`
			} `json:"audits"`
		} `json:"lighthouseResult"`
	}
	if err := json.Unmarshal(body, &parsed); err != nil {
		msg := "PSI parse error: " + err.Error()
		out.Error = &msg
		return out
	}

	cats := parsed.LighthouseResult.Categories
	audits := parsed.LighthouseResult.Audits
	out.Performance = catScore(cats, "performance")
	out.Accessibility = catScore(cats, "accessibility")
	out.BestPractices = catScore(cats, "best-practices")
	out.Seo = catScore(cats, "seo")
	out.LcpMs = auditInt(audits, "largest-contentful-paint")
	out.InpMs = auditInt(audits, "interaction-to-next-paint")
	out.TtfbMs = auditInt(audits, "server-response-time")
	if v := auditFloat(audits, "cumulative-layout-shift"); v != nil {
		cls := float64(int(*v*1000+0.5)) / 1000
		out.Cls = &cls
	}
	return out
}

// RunPagespeed runs PSI or local lab estimates (preferLocal skips Google API).
// On PSI HTTP 429 / other failures → graceful local-lab fallback with human message.
func RunPagespeed(pageURL string, apiKey *string, preferLocal bool) LighthouseScores {
	if preferLocal {
		return FetchLocalLabScores(pageURL)
	}
	out := FetchPagespeedScores(pageURL, apiKey)
	if out.Error != nil && out.Performance == nil {
		local := FetchLocalLabScores(pageURL)
		if local.Performance != nil {
			// Keep PSI human message + mark local source; claim «локальные» only after fallback.
			msg := withLocalScoresNote(derefStr(out.Error))
			local.Error = &msg
			local.ErrorCode = out.ErrorCode
			if local.ErrorCode == nil {
				code := "psi_unavailable"
				local.ErrorCode = &code
			}
			return local
		}
		// Local also failed — return original PSI error (no «Показаны локальные»).
	}
	return out
}

// withLocalScoresNote appends the honest local-fallback claim once.
func withLocalScoresNote(psiMsg string) string {
	const note = "Показаны локальные оценки — квота Google не нужна."
	if strings.Contains(psiMsg, "Показаны локальные") {
		return psiMsg
	}
	base := strings.TrimSpace(psiMsg)
	if base == "" {
		return note
	}
	return base + " " + note
}

func derefStr(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

// FetchLocalLabScores probes the URL directly — no Google quota; scores are heuristic.
func FetchLocalLabScores(pageURL string) LighthouseScores {
	fetchedAt := types.NowISO()
	out := LighthouseScores{
		URL:       pageURL,
		Source:    "local-lab",
		FetchedAt: fetchedAt,
	}

	start := time.Now()
	client := &http.Client{Timeout: 45 * time.Second}
	req, err := http.NewRequest(http.MethodGet, pageURL, nil)
	if err != nil {
		msg := err.Error()
		out.Error = &msg
		return out
	}
	req.Header.Set("User-Agent", psiUserAgent)
	res, err := client.Do(req)
	ttfb := int(time.Since(start).Milliseconds())
	out.TtfbMs = &ttfb
	if err != nil {
		msg := err.Error()
		out.Error = &msg
		return out
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(res.Body, 512<<10))

	perf := scoreFromTTFB(ttfb)
	seo := scoreFromHTTPStatus(res.StatusCode)
	bp := 78
	a11y := 72
	out.Performance = &perf
	out.Seo = &seo
	out.BestPractices = &bp
	out.Accessibility = &a11y
	lcp := ttfb + 400
	out.LcpMs = &lcp
	cls := 0.05
	out.Cls = &cls
	return out
}

func scoreFromTTFB(ms int) int {
	switch {
	case ms <= 200:
		return 92
	case ms <= 500:
		return 78
	case ms <= 1000:
		return 62
	case ms <= 2000:
		return 48
	default:
		return 35
	}
}

func scoreFromHTTPStatus(code int) int {
	switch {
	case code >= 200 && code < 300:
		return 88
	case code >= 300 && code < 400:
		return 70
	case code >= 400 && code < 500:
		return 45
	default:
		return 30
	}
}

func catScore(cats map[string]struct {
	Score *float64 `json:"score"`
}, key string) *int {
	c, ok := cats[key]
	if !ok || c.Score == nil {
		return nil
	}
	v := int(*c.Score*100 + 0.5)
	return &v
}

func auditInt(audits map[string]struct {
	NumericValue *float64 `json:"numericValue"`
}, id string) *int {
	if v := auditFloat(audits, id); v != nil {
		i := int(*v + 0.5)
		return &i
	}
	return nil
}

func auditFloat(audits map[string]struct {
	NumericValue *float64 `json:"numericValue"`
}, id string) *float64 {
	a, ok := audits[id]
	if !ok || a.NumericValue == nil {
		return nil
	}
	v := *a.NumericValue
	return &v
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

// psiHTTPError returns a human RU message + machine errorCode for non-OK PSI responses.
func psiHTTPError(status int, body string, apiKey *string) (msg string, code string) {
	code = "psi_unavailable"
	msg = fmt.Sprintf("PSI HTTP %d: %s", status, truncate(body, 180))
	noKey := apiKey == nil || strings.TrimSpace(*apiKey) == ""
	switch status {
	case http.StatusTooManyRequests:
		code = "psi_rate_limited"
		// Do not claim local scores here — FetchPagespeedScores has not fallen back yet.
		// RunPagespeed appends «Показаны локальные…» only after local-lab succeeds.
		msg = "Google PageSpeed временно ограничил запросы (HTTP 429)."
		if noKey {
			msg += " Для стабильного Lighthouse добавьте psiApiKey в «Подключениях»."
		}
	case http.StatusForbidden, http.StatusUnauthorized:
		if noKey {
			code = "psi_no_key"
			msg = "Google PageSpeed недоступен без ключа. Добавьте psiApiKey в «Подключениях» или используйте «Локальный Chromium»."
		}
	default:
		if noKey {
			code = "psi_no_key"
			msg = msg + " · Добавьте psiApiKey в «Подключениях» (необязательно) или «Локальный Chromium»."
		}
	}
	return msg, code
}

func intVal(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}
