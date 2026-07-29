package audit

import (
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/types"
)

func ProbeLlmsTxt(origin, userAgent string) LlmsResult {
	base := strings.TrimRight(strings.TrimSpace(origin), "/")
	target := base + "/llms.txt"
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest(http.MethodGet, target, nil)
	if err != nil {
		return LlmsResult{OK: false, Status: 0, URL: target}
	}
	if userAgent == "" {
		userAgent = "OpenSpider/1.0"
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/plain,*/*")

	res, err := client.Do(req)
	if err != nil {
		return LlmsResult{OK: false, Status: 0, URL: target}
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 64<<10))
	found := res.StatusCode >= 200 && res.StatusCode < 300 && strings.TrimSpace(string(body)) != ""
	return LlmsResult{
		OK:     found,
		Status: res.StatusCode,
		URL:    target,
	}
}

func llmsFromResult(r LlmsResult) *LlmsResult {
	return &r
}

func nowISO() string {
	return types.NowISO()
}
