package googlebot

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
)

type RobotsTxtInfo struct {
	URL     string  `json:"url"`
	Fetched bool    `json:"fetched"`
	Allowed *bool   `json:"allowed"`
	Note    string  `json:"note"`
}

func checkRobotsTxt(ctx context.Context, client *http.Client, pageURL, userAgent string, device Device) RobotsTxtInfo {
	u, err := url.Parse(pageURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return RobotsTxtInfo{Note: "invalid page URL"}
	}
	robotsURL := u.Scheme + "://" + u.Host + "/robots.txt"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, robotsURL, nil)
	if err != nil {
		return RobotsTxtInfo{Note: err.Error()}
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "text/plain,*/*")

	resp, err := client.Do(req)
	if err != nil {
		return RobotsTxtInfo{URL: robotsURL, Note: err.Error()}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		allowed := true
		return RobotsTxtInfo{
			URL:     robotsURL,
			Fetched: false,
			Allowed: &allowed,
			Note:    fmt.Sprintf("robots.txt: HTTP %d — treating path as allowed", resp.StatusCode),
		}
	}

	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512<<10))
	path := u.Path
	if path == "" {
		path = "/"
	}
	allowed := pathAllowedByRobots(string(body), path, device)
	note := fmt.Sprintf("Path allowed for %s crawler (or *) in robots.txt", device)
	if !allowed {
		note = fmt.Sprintf("Disallow for %s crawler — indexing may be blocked", device)
	}
	return RobotsTxtInfo{
		URL:     robotsURL,
		Fetched: true,
		Allowed: &allowed,
		Note:    note,
	}
}

func pathAllowedByRobots(robotsBody, path string, device Device) bool {
	lines := strings.Split(robotsBody, "\n")
	inTarget := false
	inStar := false
	var rules []robotsRule
	var starRules []robotsRule

	mobileTokens := map[string]struct{}{
		"googlebot-mobile":     {},
		"googlebot-smartphone": {},
		"googlebot-image":      {},
	}
	desktopTokens := map[string]struct{}{
		"googlebot":      {},
		"googlebot-news": {},
	}

	for _, raw := range lines {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		lower := strings.ToLower(line)
		if strings.HasPrefix(lower, "user-agent:") {
			ua := strings.TrimSpace(line[strings.Index(line, ":")+1:])
			uaLower := strings.ToLower(ua)
			inStar = uaLower == "*"
			if device == DeviceMobile {
				_, inTarget = mobileTokens[uaLower]
				if !inTarget && uaLower == "googlebot" {
					inTarget = true
				}
			} else {
				_, inTarget = desktopTokens[uaLower]
			}
			continue
		}
		if strings.HasPrefix(lower, "allow:") {
			value := strings.TrimSpace(line[strings.Index(line, ":")+1:])
			if value == "" {
				value = "/"
			}
			if inTarget {
				rules = append(rules, robotsRule{allow: true, prefix: prefixBeforeStar(value)})
			} else if inStar {
				starRules = append(starRules, robotsRule{allow: true, prefix: prefixBeforeStar(value)})
			}
			continue
		}
		if strings.HasPrefix(lower, "disallow:") {
			value := strings.TrimSpace(line[strings.Index(line, ":")+1:])
			if value == "" {
				continue
			}
			if inTarget {
				rules = append(rules, robotsRule{allow: false, prefix: prefixBeforeStar(value)})
			} else if inStar {
				starRules = append(starRules, robotsRule{allow: false, prefix: prefixBeforeStar(value)})
			}
		}
	}

	active := rules
	if len(active) == 0 {
		active = starRules
	}
	if len(active) == 0 {
		return true
	}

	var best *robotsRule
	for _, rule := range active {
		if !strings.HasPrefix(path, rule.prefix) {
			continue
		}
		if best == nil || len(rule.prefix) > len(best.prefix) {
			copy := rule
			best = &copy
		}
	}
	if best == nil {
		return true
	}
	return best.allow
}

type robotsRule struct {
	allow  bool
	prefix string
}

func prefixBeforeStar(value string) string {
	if idx := strings.Index(value, "*"); idx >= 0 {
		if idx == 0 {
			return "/"
		}
		return value[:idx]
	}
	return value
}
