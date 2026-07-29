package googlebot

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"

	"github.com/PuerkitoBio/goquery"
	"github.com/openspider/openspider/internal/crawl"
	"github.com/openspider/openspider/internal/types"
)

type Heading struct {
	Level int    `json:"level"`
	Text  string `json:"text"`
}

type ViewResult struct {
	URL                 string           `json:"url"`
	FinalURL            string           `json:"finalUrl"`
	StatusCode          int              `json:"statusCode"`
	ContentType         *string          `json:"contentType"`
	ContentLanguage     *string          `json:"contentLanguage"`
	AcceptLanguage      string           `json:"acceptLanguage"`
	LanguageID          *string          `json:"languageId"`
	UserAgent           string           `json:"userAgent"`
	ProfileID           string           `json:"profileId"`
	Device              Device           `json:"device"`
	ViewportWidth       int              `json:"viewportWidth"`
	RobotsTxt           RobotsTxtInfo    `json:"robotsTxt"`
	Title               *string          `json:"title"`
	MetaDescription     *string          `json:"metaDescription"`
	Canonical           *string          `json:"canonical"`
	RobotsMeta          *string          `json:"robotsMeta"`
	HTMLLang            *string          `json:"htmlLang"`
	Hreflang            []types.HreflangRef `json:"hreflang"`
	HreflangHasSelf     bool             `json:"hreflangHasSelf"`
	HreflangHasXDefault bool             `json:"hreflangHasXDefault"`
	Headings            []Heading        `json:"headings"`
	TextPreview         string           `json:"textPreview"`
	WordCount           int              `json:"wordCount"`
	Links               []string         `json:"links"`
	Noindex             bool             `json:"noindex"`
	FetchedAt           string           `json:"fetchedAt"`
	Note                string           `json:"note"`
}

type Request struct {
	URL                  string   `json:"url"`
	Profile              string   `json:"profile,omitempty"`
	UserAgent            string   `json:"userAgent,omitempty"`
	AcceptLanguage       string   `json:"acceptLanguage,omitempty"`
	CompareDesktopMobile bool     `json:"compareDesktopMobile,omitempty"`
	CompareLanguages     []string `json:"compareLanguages,omitempty"`
}

type Response struct {
	Views []ViewResult `json:"views"`
}

var spaceRe = regexp.MustCompile(`\s+`)

func FetchView(ctx context.Context, req Request) (Response, error) {
	trimmed := strings.TrimSpace(req.URL)
	if trimmed == "" {
		return Response{}, fmt.Errorf("URL is required")
	}
	parsed, err := url.Parse(trimmed)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return Response{}, fmt.Errorf("invalid URL")
	}
	target := parsed.String()

	client := crawl.NewHTTPClient(25000)

	if len(req.CompareLanguages) > 0 {
		desktop := resolveProfile(ProfileGooglebotDesktop, "")
		ids := req.CompareLanguages
		if len(ids) == 0 {
			ids = defaultCompareLanguages
		}
		views := make([]ViewResult, 0, len(ids))
		var mu sync.Mutex
		var wg sync.WaitGroup
		errCh := make(chan error, len(ids))
		for _, id := range ids {
			lang, ok := languageByID(id)
			if !ok {
				if fallback, ok := languageByID("en"); ok {
					lang = fallback
				} else {
					continue
				}
			}
			wg.Add(1)
			go func(lang LanguageDef) {
				defer wg.Done()
				view, err := fetchOneView(ctx, client, fetchOneOptions{
					target:         target,
					profileID:      desktop.ID,
					device:         desktop.Device,
					userAgent:      desktop.UserAgent,
					viewportWidth:  desktop.ViewportWidth,
					acceptLanguage: lang.AcceptLanguage,
					languageID:     lang.ID,
				})
				if err != nil {
					errCh <- err
					return
				}
				mu.Lock()
				views = append(views, view)
				mu.Unlock()
			}(lang)
		}
		wg.Wait()
		close(errCh)
		if err := firstErr(errCh); err != nil {
			return Response{}, err
		}
		return Response{Views: views}, nil
	}

	if req.CompareDesktopMobile {
		desktop := resolveProfile(ProfileGooglebotDesktop, "")
		mobile := resolveProfile(ProfileGooglebotSmart, "")
		acceptLanguage := strings.TrimSpace(req.AcceptLanguage)
		if acceptLanguage == "" {
			acceptLanguage = defaultAcceptLanguage
		}
		desktopView, err := fetchOneView(ctx, client, fetchOneOptions{
			target:         target,
			profileID:      desktop.ID,
			device:         desktop.Device,
			userAgent:      desktop.UserAgent,
			viewportWidth:  desktop.ViewportWidth,
			acceptLanguage: acceptLanguage,
		})
		if err != nil {
			return Response{}, err
		}
		mobileView, err := fetchOneView(ctx, client, fetchOneOptions{
			target:         target,
			profileID:      mobile.ID,
			device:         mobile.Device,
			userAgent:      mobile.UserAgent,
			viewportWidth:  mobile.ViewportWidth,
			acceptLanguage: acceptLanguage,
		})
		if err != nil {
			return Response{}, err
		}
		return Response{Views: []ViewResult{desktopView, mobileView}}, nil
	}

	resolved := resolveProfile(req.Profile, req.UserAgent)
	acceptLanguage := strings.TrimSpace(req.AcceptLanguage)
	if acceptLanguage == "" {
		acceptLanguage = defaultAcceptLanguage
	}
	view, err := fetchOneView(ctx, client, fetchOneOptions{
		target:         target,
		profileID:      resolved.ID,
		device:         resolved.Device,
		userAgent:      resolved.UserAgent,
		viewportWidth:  resolved.ViewportWidth,
		acceptLanguage: acceptLanguage,
	})
	if err != nil {
		return Response{}, err
	}
	return Response{Views: []ViewResult{view}}, nil
}

type fetchOneOptions struct {
	target         string
	profileID      string
	device         Device
	userAgent      string
	viewportWidth  int
	acceptLanguage string
	languageID     string
}

func fetchOneView(ctx context.Context, client *http.Client, opts fetchOneOptions) (ViewResult, error) {
	robotsTxt := checkRobotsTxt(ctx, client, opts.target, opts.userAgent, opts.device)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, opts.target, nil)
	if err != nil {
		return ViewResult{}, err
	}
	for k, v := range buildRequestHeaders(opts.userAgent, opts.device, opts.viewportWidth, opts.acceptLanguage) {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err != nil {
		return ViewResult{}, err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return ViewResult{}, err
	}
	html := string(bodyBytes)
	finalURL := opts.target
	if resp.Request != nil && resp.Request.URL != nil {
		finalURL = resp.Request.URL.String()
	}

	contentType := headerPtr(resp.Header.Get("Content-Type"))
	contentLanguage := headerPtr(resp.Header.Get("Content-Language"))
	extracted := crawl.ExtractHTML(html, finalURL)
	headings := extractHeadings(html)
	textPreview := extractTextPreview(html)

	robotsMeta := ""
	if extracted.RobotsMeta != nil {
		robotsMeta = strings.ToLower(*extracted.RobotsMeta)
	}
	noindex := strings.Contains(robotsMeta, "noindex")

	hreflang := extracted.Hreflang
	if hreflang == nil {
		hreflang = []types.HreflangRef{}
	}
	hreflangHasSelf := false
	hreflangHasXDefault := false
	for _, ref := range hreflang {
		if sameURL(ref.Href, finalURL) {
			hreflangHasSelf = true
		}
		if strings.EqualFold(ref.Lang, "x-default") {
			hreflangHasXDefault = true
		}
	}

	links := extracted.Links
	if len(links) > 80 {
		links = links[:80]
	}

	var languageID *string
	if opts.languageID != "" {
		languageID = &opts.languageID
	}

	note := "Desktop UA. HTML without JavaScript execution."
	if opts.languageID != "" {
		note = fmt.Sprintf("Accept-Language=%s. HTML without JavaScript execution.", opts.languageID)
	} else if opts.device == DeviceMobile {
		note = "Mobile UA + viewport hints. HTML without JavaScript execution."
	}

	return ViewResult{
		URL:                 opts.target,
		FinalURL:            finalURL,
		StatusCode:          resp.StatusCode,
		ContentType:         contentType,
		ContentLanguage:     contentLanguage,
		AcceptLanguage:      opts.acceptLanguage,
		LanguageID:          languageID,
		UserAgent:           opts.userAgent,
		ProfileID:           opts.profileID,
		Device:              opts.device,
		ViewportWidth:       opts.viewportWidth,
		RobotsTxt:           robotsTxt,
		Title:               extracted.Title,
		MetaDescription:     extracted.MetaDescription,
		Canonical:           extracted.Canonical,
		RobotsMeta:          extracted.RobotsMeta,
		HTMLLang:            extracted.HTMLLang,
		Hreflang:            hreflang,
		HreflangHasSelf:     hreflangHasSelf,
		HreflangHasXDefault: hreflangHasXDefault,
		Headings:            headings,
		TextPreview:         textPreview,
		WordCount:           extracted.WordCount,
		Links:               links,
		Noindex:             noindex,
		FetchedAt:           types.NowISO(),
		Note:                note,
	}, nil
}

func buildRequestHeaders(userAgent string, device Device, viewportWidth int, acceptLanguage string) map[string]string {
	headers := map[string]string{
		"User-Agent":       userAgent,
		"Accept":           "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
		"Accept-Language":  acceptLanguage,
		"Sec-CH-UA-Mobile": "?0",
		"Sec-CH-UA-Platform": `"Windows"`,
		"Viewport-Width":   fmt.Sprintf("%d", viewportWidth),
	}
	if device == DeviceMobile {
		headers["Sec-CH-UA-Mobile"] = "?1"
		headers["Sec-CH-UA-Platform"] = `"Android"`
		headers["Sec-CH-Viewport-Width"] = fmt.Sprintf("%d", viewportWidth)
	}
	return headers
}

func extractHeadings(html string) []Heading {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return []Heading{}
	}
	out := []Heading{}
	doc.Find("h1, h2, h3").EachWithBreak(func(_ int, s *goquery.Selection) bool {
		if len(out) >= 40 {
			return false
		}
		tag := goquery.NodeName(s)
		text := strings.TrimSpace(spaceRe.ReplaceAllString(s.Text(), " "))
		if text == "" {
			return true
		}
		level := 0
		if len(tag) == 2 && tag[0] == 'h' {
			level = int(tag[1] - '0')
		}
		if level >= 1 && level <= 3 {
			if len(text) > 160 {
				text = text[:160]
			}
			out = append(out, Heading{Level: level, Text: text})
		}
		return true
	})
	return out
}

func extractTextPreview(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	doc.Find("script, style, noscript, svg, iframe").Remove()
	text := strings.TrimSpace(spaceRe.ReplaceAllString(doc.Find("body").Text(), " "))
	if len(text) > 4000 {
		return text[:4000]
	}
	return text
}

func sameURL(a, b string) bool {
	left, errL := url.Parse(a)
	right, errR := url.Parse(b)
	if errL != nil || errR != nil {
		return a == b
	}
	leftPath := strings.TrimSuffix(left.Path, "/")
	rightPath := strings.TrimSuffix(right.Path, "/")
	return left.Scheme == right.Scheme &&
		left.Host == right.Host &&
		leftPath == rightPath &&
		left.RawQuery == right.RawQuery
}

func headerPtr(v string) *string {
	v = strings.TrimSpace(v)
	if v == "" {
		return nil
	}
	return &v
}

func firstErr(ch <-chan error) error {
	for err := range ch {
		if err != nil {
			return err
		}
	}
	return nil
}
