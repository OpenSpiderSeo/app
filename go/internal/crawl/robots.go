package crawl

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
)

type RobotsGate struct {
	rules    map[string]bool // path prefix -> allowed
	sitemaps []string
	defaultAllow bool
}

func FetchRobotsGate(ctx context.Context, client *http.Client, origin, userAgent string) *RobotsGate {
	robotsURL := strings.TrimRight(origin, "/") + "/robots.txt"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, robotsURL, nil)
	if err != nil {
		return allowAllGate()
	}
	if userAgent != "" {
		req.Header.Set("User-Agent", userAgent)
	}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		if resp != nil {
			resp.Body.Close()
		}
		return allowAllGate()
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512<<10))
	resp.Body.Close()
	return parseRobotsTxt(robotsURL, string(body), userAgent)
}

func allowAllGate() *RobotsGate {
	return &RobotsGate{defaultAllow: true, rules: map[string]bool{}}
}

func parseRobotsTxt(robotsURL, body, userAgent string) *RobotsGate {
	gate := &RobotsGate{rules: map[string]bool{}, defaultAllow: true}
	lines := strings.Split(body, "\n")
	ua := strings.ToLower(strings.TrimSpace(userAgent))
	active := false
	isStar := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if i := strings.Index(line, "#"); i >= 0 {
			line = strings.TrimSpace(line[:i])
		}
		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimSpace(parts[0]))
		val := strings.TrimSpace(parts[1])
		switch key {
		case "user-agent":
			v := strings.ToLower(val)
			isStar = v == "*"
			active = isStar || strings.Contains(ua, v) || strings.Contains(v, strings.Fields(ua)[0])
		case "disallow":
			if !active {
				continue
			}
			path := val
			if path == "" {
				gate.defaultAllow = true
				continue
			}
			gate.rules[normalizeRobotsPath(path)] = false
		case "allow":
			if !active {
				continue
			}
			gate.rules[normalizeRobotsPath(val)] = true
		case "sitemap":
			gate.sitemaps = append(gate.sitemaps, val)
		}
	}
	return gate
}

func normalizeRobotsPath(p string) string {
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	return p
}

func (g *RobotsGate) IsAllowed(rawURL string) bool {
	if g == nil || g.defaultAllow && len(g.rules) == 0 {
		return true
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return true
	}
	path := u.Path
	if path == "" {
		path = "/"
	}
	if u.RawQuery != "" {
		path += "?" + u.RawQuery
	}

	longest := ""
	allowed := g.defaultAllow
	for prefix, ok := range g.rules {
		if strings.HasPrefix(path, prefix) && len(prefix) >= len(longest) {
			longest = prefix
			allowed = ok
		}
	}
	return allowed
}

func (g *RobotsGate) Sitemaps() []string {
	if g == nil {
		return nil
	}
	return append([]string(nil), g.sitemaps...)
}

var robotsCache sync.Map // origin -> *RobotsGate

func GetRobotsGate(origin string, fetch func() *RobotsGate) *RobotsGate {
	if v, ok := robotsCache.Load(origin); ok {
		return v.(*RobotsGate)
	}
	gate := fetch()
	robotsCache.Store(origin, gate)
	return gate
}

func ClearRobotsCache() {
	robotsCache = sync.Map{}
}
