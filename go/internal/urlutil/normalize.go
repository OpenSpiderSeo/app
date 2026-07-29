package urlutil

import (
	"net/url"
	"strings"
)

var stripQuery = map[string]struct{}{
	"utm_source": {}, "utm_medium": {}, "utm_campaign": {}, "utm_term": {}, "utm_content": {},
	"gclid": {}, "fbclid": {}, "mc_cid": {}, "mc_eid": {},
}

// NormalizeURL strips tracking params, lowercases host, trims trailing slash on paths.
func NormalizeURL(raw string, base string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	if base != "" && (u.Scheme == "" || u.Host == "") {
		b, err := url.Parse(base)
		if err == nil {
			u = b.ResolveReference(u)
		}
	}
	if u.Scheme == "" || u.Host == "" {
		return ""
	}
	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)
	u.Fragment = ""

	q := u.Query()
	for k := range q {
		if _, drop := stripQuery[strings.ToLower(k)]; drop {
			q.Del(k)
		}
	}
	u.RawQuery = q.Encode()

	path := u.Path
	if path != "" && path != "/" && strings.HasSuffix(path, "/") {
		u.Path = strings.TrimSuffix(path, "/")
	}
	return u.String()
}

func OriginOf(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func SameOrigin(a, b string) bool {
	return OriginOf(a) != "" && OriginOf(a) == OriginOf(b)
}

func ResolveHref(href, pageURL string) string {
	href = strings.TrimSpace(href)
	if href == "" || strings.HasPrefix(href, "#") ||
		strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") ||
		strings.HasPrefix(href, "javascript:") {
		return ""
	}
	base, err := url.Parse(pageURL)
	if err != nil {
		return ""
	}
	ref, err := url.Parse(href)
	if err != nil {
		return ""
	}
	resolved := base.ResolveReference(ref)
	if resolved.Scheme != "http" && resolved.Scheme != "https" {
		return ""
	}
	return NormalizeURL(resolved.String(), "")
}
