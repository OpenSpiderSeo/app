package audit

import (
	"net/url"
	"strings"

	"github.com/openspider/openspider/internal/types"
)

func buildPagePreview(page types.CrawledPage) PagePreviewData {
	domain := hostname(page.URL)
	serpTitle := firstNonEmpty(page.Title, page.OgTitle, strPtr(page.URL))
	serpDesc := firstNonEmpty(page.MetaDescription, page.Excerpt, strPtr(""))
	socialTitle := firstNonEmpty(page.OgTitle, page.Title, strPtr(domain))
	socialDesc := firstNonEmpty(page.MetaDescription, page.Excerpt, strPtr(""))

	ogImage := resolveImage(page.OgImageOnly, page.OgImage, page.URL)
	twitterImage := resolveImage(page.TwitterImage, nil, page.URL)
	socialImage := ogImage
	if socialImage == nil {
		socialImage = twitterImage
	}

	return PagePreviewData{
		URL:               page.URL,
		Domain:            domain,
		SerpTitle:         serpTitle,
		SerpDescription:   serpDesc,
		SocialTitle:       socialTitle,
		SocialDescription: socialDesc,
		SocialImage:       socialImage,
		OgImage:           ogImage,
		TwitterImage:      twitterImage,
	}
}

func pickPreviewPages(pages []types.CrawledPage, startURL string, limit int) []types.CrawledPage {
	if len(pages) == 0 {
		return nil
	}
	if limit <= 0 {
		limit = 3
	}
	target := normURL(startURL)
	primaryIdx := 0
	for i, p := range pages {
		if normURL(p.URL) == target {
			primaryIdx = i
			break
		}
	}
	primary := pages[primaryIdx]
	out := []types.CrawledPage{primary}
	for _, p := range pages {
		if p.URL == primary.URL {
			continue
		}
		out = append(out, p)
		if len(out) >= limit {
			break
		}
	}
	return out
}

type previewCoverage struct {
	withOgTitle, withOgImage, withDescription, total int
}

func measurePreviewCoverage(pages []types.CrawledPage) previewCoverage {
	c := previewCoverage{total: len(pages)}
	for _, p := range pages {
		if firstNonEmpty(p.OgTitle, p.OgTitleOnly, nil) != "" {
			c.withOgTitle++
		}
		if firstNonEmpty(p.OgImage, p.OgImageOnly, p.TwitterImage) != "" {
			c.withOgImage++
		}
		if firstNonEmpty(p.MetaDescription, nil, nil) != "" {
			c.withDescription++
		}
	}
	return c
}

func hostname(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return strings.TrimPrefix(u.Hostname(), "www.")
}

func normURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	path := strings.TrimRight(u.Path, "/")
	if path == "" {
		path = "/"
	}
	return u.Scheme + "://" + u.Host + path
}

func resolveImage(primary, fallback *string, pageURL string) *string {
	raw := firstNonEmpty(primary, fallback, nil)
	if raw == "" {
		return nil
	}
	abs := resolveAbsolute(raw, pageURL)
	if abs == "" {
		return nil
	}
	return &abs
}

func resolveAbsolute(raw, pageURL string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw
	}
	base, err := url.Parse(pageURL)
	if err != nil {
		return raw
	}
	ref, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	return base.ResolveReference(ref).String()
}

func firstNonEmpty(a, b, c *string) string {
	for _, p := range []*string{a, b, c} {
		if p != nil && strings.TrimSpace(*p) != "" {
			return strings.TrimSpace(*p)
		}
	}
	return ""
}

func strPtr(s string) *string {
	return &s
}
