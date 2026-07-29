package crawl

import (
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/openspider/openspider/internal/jsonutil"
	"github.com/openspider/openspider/internal/types"
	"github.com/openspider/openspider/internal/urlutil"
)

type Extracted struct {
	Title                      *string
	MetaDescriptionOnly        *string
	MetaDescription            *string
	H1                         []string
	H2Count                    int
	Canonical                  *string
	RobotsMeta                 *string
	OgTitle                    *string
	OgTitleOnly                *string
	OgImage                    *string
	OgImageOnly                *string
	TwitterImage               *string
	TwitterCard                *string
	WordCount                  int
	ImagesTotal                int
	ImagesMissingAlt           int
	ButtonsWithoutName         int
	LinksWithoutAccessibleName int
	HasSkipLink                bool
	JsonLdCount                int
	JsonLdTypes                []string
	JsonLdInvalid              bool
	JsonLdLocalNapIncomplete   bool
	JsonLdLocalNapEvidence     []types.LocalNapEntryEvidence
	HasViewport                bool
	HTMLLang                   *string
	Hreflang                   []types.HreflangRef
	Links                      []string
	ExactContentHash           string
	Excerpt                    *string
}

var spaceRe = regexp.MustCompile(`\s+`)

func decode(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

func ExtractHTML(html, pageURL string) Extracted {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return Extracted{HasViewport: true}
	}

	title := decode(doc.Find("title").First().Text())
	metaDescOnly := decode(doc.Find(`meta[name="description"]`).AttrOr("content", ""))
	ogDesc := decode(doc.Find(`meta[property="og:description"]`).AttrOr("content", ""))
	metaDesc := metaDescOnly
	if metaDesc == nil {
		metaDesc = ogDesc
	}

	var h1 = []string{}
	doc.Find("h1").Each(func(_ int, s *goquery.Selection) {
		if t := decode(s.Text()); t != nil {
			h1 = append(h1, *t)
		}
	})

	canonicalHref := strings.TrimSpace(doc.Find(`link[rel="canonical"]`).AttrOr("href", ""))
	var canonical *string
	if canonicalHref != "" {
		if n := urlutil.NormalizeURL(canonicalHref, pageURL); n != "" {
			canonical = &n
		}
	}

	robots := decode(doc.Find(`meta[name="robots"]`).AttrOr("content", ""))
	htmlLang := decode(doc.Find("html").AttrOr("lang", ""))

	ogTitleOnly := decode(doc.Find(`meta[property="og:title"]`).AttrOr("content", ""))
	ogTitle := ogTitleOnly
	if ogTitle == nil {
		ogTitle = decode(doc.Find(`meta[name="twitter:title"]`).AttrOr("content", ""))
	}
	twitterCard := decode(doc.Find(`meta[name="twitter:card"]`).AttrOr("content", ""))
	ogImageRaw := strings.TrimSpace(doc.Find(`meta[property="og:image"]`).AttrOr("content", ""))
	twitterImageRaw := strings.TrimSpace(doc.Find(`meta[name="twitter:image"]`).AttrOr("content", ""))
	var ogImageOnly, twitterImage, ogImage *string
	if ogImageRaw != "" {
		if n := urlutil.NormalizeURL(ogImageRaw, pageURL); n != "" {
			ogImageOnly = &n
		}
	}
	if twitterImageRaw != "" {
		if n := urlutil.NormalizeURL(twitterImageRaw, pageURL); n != "" {
			twitterImage = &n
		}
	}
	ogImage = ogImageOnly
	if ogImage == nil {
		ogImage = twitterImage
	}

	bodyText := spaceRe.ReplaceAllString(doc.Find("body").Text(), " ")
	wordCount := 0
	if bodyText != "" {
		wordCount = len(strings.Fields(bodyText))
	}
	exactHash := contentHash(bodyText)

	var excerpt *string
	if metaDesc != nil {
		excerpt = metaDesc
	} else if wordCount > 0 {
		words := strings.Fields(bodyText)
		if len(words) > 40 {
			s := strings.Join(words[:40], " ") + "…"
			excerpt = &s
		} else {
			excerpt = &bodyText
		}
	}

	imagesTotal, imagesMissingAlt := 0, 0
	doc.Find("img").Each(func(_ int, s *goquery.Selection) {
		imagesTotal++
		alt, ok := s.Attr("alt")
		if !ok || strings.TrimSpace(alt) == "" {
			imagesMissingAlt++
		}
	})

	buttonsWithoutName := 0
	doc.Find(`button, input[type="submit"], input[type="button"], [role="button"]`).Each(func(_ int, s *goquery.Selection) {
		if !hasAccessibleName(s) {
			buttonsWithoutName++
		}
	})

	linksWithoutName := 0
	doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
		if !hasAccessibleName(s) {
			linksWithoutName++
		}
	})

	hasSkipLink := false
	doc.Find(`a[href^="#"]`).Each(func(_ int, s *goquery.Selection) {
		text := strings.ToLower(s.Text())
		cls, _ := s.Attr("class")
		id, _ := s.Attr("id")
		if strings.Contains(text, "skip") || strings.Contains(strings.ToLower(cls), "skip") || strings.Contains(strings.ToLower(id), "skip") {
			hasSkipLink = true
		}
	})

	typesSet := map[string]struct{}{}
	jsonLdInvalid := false
	var napEvidence []types.LocalNapEntryEvidence
	jsonLdCount := 0
	doc.Find(`script[type="application/ld+json"]`).Each(func(_ int, s *goquery.Selection) {
		jsonLdCount++
		raw := strings.TrimSpace(s.Text())
		if raw == "" {
			jsonLdInvalid = true
			return
		}
		var parsed interface{}
		if err := json.Unmarshal([]byte(raw), &parsed); err != nil {
			jsonLdInvalid = true
			return
		}
		collectTypes(parsed, typesSet)
		collectLocalNap(parsed, &napEvidence)
	})

	var jsonLdTypes = []string{}
	for t := range typesSet {
		jsonLdTypes = append(jsonLdTypes, t)
	}

	hasViewport := doc.Find(`meta[name="viewport"]`).Length() > 0

	var hreflang = []types.HreflangRef{}
	doc.Find(`link[rel="alternate"][hreflang]`).Each(func(_ int, s *goquery.Selection) {
		lang := strings.TrimSpace(s.AttrOr("hreflang", ""))
		hrefRaw := strings.TrimSpace(s.AttrOr("href", ""))
		if lang == "" || hrefRaw == "" {
			return
		}
		href := urlutil.NormalizeURL(hrefRaw, pageURL)
		if href == "" {
			href = hrefRaw
		}
		hreflang = append(hreflang, types.HreflangRef{Lang: lang, Href: href})
	})

	var links = []string{}
	seen := map[string]struct{}{}
	doc.Find("a[href]").Each(func(_ int, s *goquery.Selection) {
		href, ok := s.Attr("href")
		if !ok {
			return
		}
		if resolved := urlutil.ResolveHref(href, pageURL); resolved != "" {
			if _, dup := seen[resolved]; !dup {
				seen[resolved] = struct{}{}
				links = append(links, resolved)
			}
		}
	})

	return Extracted{
		Title:                      title,
		MetaDescriptionOnly:        metaDescOnly,
		MetaDescription:            metaDesc,
		H1:                         h1,
		H2Count:                    doc.Find("h2").Length(),
		Canonical:                  canonical,
		RobotsMeta:                 robots,
		OgTitle:                    ogTitle,
		OgTitleOnly:                ogTitleOnly,
		OgImage:                    ogImage,
		OgImageOnly:                ogImageOnly,
		TwitterImage:               twitterImage,
		TwitterCard:                twitterCard,
		WordCount:                  wordCount,
		ImagesTotal:                imagesTotal,
		ImagesMissingAlt:           imagesMissingAlt,
		ButtonsWithoutName:         buttonsWithoutName,
		LinksWithoutAccessibleName: linksWithoutName,
		HasSkipLink:                hasSkipLink,
		JsonLdCount:                jsonLdCount,
		JsonLdTypes:                jsonLdTypes,
		JsonLdInvalid:              jsonLdInvalid,
		JsonLdLocalNapIncomplete:   len(napEvidence) > 0,
		JsonLdLocalNapEvidence:     napEvidence,
		HasViewport:                hasViewport,
		HTMLLang:                   htmlLang,
		Hreflang:                   hreflang,
		Links:                      links,
		ExactContentHash:           exactHash,
		Excerpt:                    excerpt,
	}
}

func hasAccessibleName(s *goquery.Selection) bool {
	if v := strings.TrimSpace(s.AttrOr("aria-label", "")); v != "" {
		return true
	}
	if v := strings.TrimSpace(s.AttrOr("aria-labelledby", "")); v != "" {
		return true
	}
	if v := strings.TrimSpace(s.AttrOr("title", "")); v != "" {
		return true
	}
	if v := strings.TrimSpace(s.AttrOr("value", "")); v != "" {
		return true
	}
	return strings.TrimSpace(s.Text()) != ""
}

func contentHash(bodyText string) string {
	body := strings.ToLower(spaceRe.ReplaceAllString(bodyText, " "))
	sum := sha1.Sum([]byte(body))
	return hex.EncodeToString(sum[:])
}

func collectTypes(node interface{}, out map[string]struct{}) {
	switch v := node.(type) {
	case []interface{}:
		for _, item := range v {
			collectTypes(item, out)
		}
	case map[string]interface{}:
		if t, ok := v["@type"]; ok {
			switch tv := t.(type) {
			case string:
				out[tv] = struct{}{}
			case []interface{}:
				for _, x := range tv {
					if xs, ok := x.(string); ok {
						out[xs] = struct{}{}
					}
				}
			}
		}
		if g, ok := v["@graph"]; ok {
			collectTypes(g, out)
		}
	}
}

func collectLocalNap(node interface{}, out *[]types.LocalNapEntryEvidence) {
	switch v := node.(type) {
	case []interface{}:
		for _, item := range v {
			collectLocalNap(item, out)
		}
	case map[string]interface{}:
		var schemaTypes []string
		if t, ok := v["@type"]; ok {
			switch tv := t.(type) {
			case string:
				schemaTypes = append(schemaTypes, tv)
			case []interface{}:
				for _, x := range tv {
					if xs, ok := x.(string); ok {
						schemaTypes = append(schemaTypes, xs)
					}
				}
			}
		}
		for _, schemaType := range schemaTypes {
			if isLocalNapType(schemaType) && !hasNapFields(v) {
				*out = append(*out, types.LocalNapEntryEvidence{
					SchemaType:   schemaType,
					HasTelephone: hasPhone(v),
					HasAddress:   hasAddress(v),
					HasName:      hasName(v),
					BusinessName: businessName(v),
				})
			}
		}
		if g, ok := v["@graph"]; ok {
			collectLocalNap(g, out)
		}
	}
}

func isLocalNapType(t string) bool {
	if t == "LocalBusiness" || strings.HasSuffix(t, "Business") {
		return true
	}
	switch t {
	case "Store", "Restaurant", "FoodEstablishment", "MedicalBusiness",
		"ProfessionalService", "Dentist", "LegalService", "RealEstateAgent",
		"HomeAndConstructionBusiness":
		return true
	}
	return false
}

func hasPhone(obj map[string]interface{}) bool {
	phone, _ := obj["telephone"]
	if phone == nil {
		phone = obj["phone"]
	}
	if s, ok := phone.(string); ok {
		return strings.TrimSpace(s) != ""
	}
	return phone != nil
}

func hasAddress(obj map[string]interface{}) bool {
	addr := obj["address"]
	if s, ok := addr.(string); ok {
		return strings.TrimSpace(s) != ""
	}
	return addr != nil
}

func hasName(obj map[string]interface{}) bool {
	name, _ := obj["name"].(string)
	return strings.TrimSpace(name) != ""
}

func businessName(obj map[string]interface{}) *string {
	name, _ := obj["name"].(string)
	name = strings.TrimSpace(name)
	if name == "" {
		return nil
	}
	return &name
}

func hasNapFields(obj map[string]interface{}) bool {
	return hasPhone(obj) && hasAddress(obj)
}

func BuildPage(url string, status int, contentType, redirect *string, depth, inlinks int, extracted Extracted, fetchErr *string) types.CrawledPage {
	readingMin := 0
	if extracted.WordCount > 0 {
		readingMin = extracted.WordCount / 200
		if readingMin < 1 && extracted.WordCount >= 50 {
			readingMin = 1
		}
	}
	var hash *string
	if extracted.ExactContentHash != "" {
		hash = &extracted.ExactContentHash
	}
	evidence := extracted.JsonLdLocalNapEvidence
	if evidence == nil {
		evidence = []types.LocalNapEntryEvidence{}
	}
	return types.CrawledPage{
		URL:                        url,
		StatusCode:                 status,
		ContentType:                contentType,
		Title:                      extracted.Title,
		MetaDescriptionOnly:        extracted.MetaDescriptionOnly,
		MetaDescription:            extracted.MetaDescription,
		H1:                         jsonutil.NonNilStrings(extracted.H1),
		H2Count:                    extracted.H2Count,
		Canonical:                  extracted.Canonical,
		RobotsMeta:                 extracted.RobotsMeta,
		OgTitle:                    extracted.OgTitle,
		OgTitleOnly:                extracted.OgTitleOnly,
		OgImage:                    extracted.OgImage,
		OgImageOnly:                extracted.OgImageOnly,
		TwitterImage:               extracted.TwitterImage,
		TwitterCard:                extracted.TwitterCard,
		WordCount:                  extracted.WordCount,
		ImagesTotal:                extracted.ImagesTotal,
		ImagesMissingAlt:           extracted.ImagesMissingAlt,
		ButtonsWithoutName:         extracted.ButtonsWithoutName,
		LinksWithoutAccessibleName: extracted.LinksWithoutAccessibleName,
		HasSkipLink:                extracted.HasSkipLink,
		JsonLdCount:                extracted.JsonLdCount,
		JsonLdTypes:                jsonutil.NonNilStrings(extracted.JsonLdTypes),
		JsonLdInvalid:              extracted.JsonLdInvalid,
		JsonLdLocalNapIncomplete:   extracted.JsonLdLocalNapIncomplete,
		JsonLdLocalNapEvidence:     evidence,
		HasViewport:                extracted.HasViewport,
		HTMLLang:                   extracted.HTMLLang,
		Hreflang:                   jsonutil.NonNilHreflang(extracted.Hreflang),
		ReadingTimeMin:             readingMin,
		Excerpt:                    extracted.Excerpt,
		TopKeywords:                jsonutil.NonNilStrings(nil),
		ExactContentHash:           hash,
		Rendered:                   false,
		Depth:                      depth,
		Inlinks:                    inlinks,
		Outlinks:                   len(extracted.Links),
		RedirectURL:                redirect,
		FetchedAt:                  types.NowISO(),
		Error:                      fetchErr,
	}
}

// NormalizePage ensures JSON-serializable slices are never null.
func NormalizePage(p types.CrawledPage) types.CrawledPage {
	p.H1 = jsonutil.NonNilStrings(p.H1)
	p.JsonLdTypes = jsonutil.NonNilStrings(p.JsonLdTypes)
	p.TopKeywords = jsonutil.NonNilStrings(p.TopKeywords)
	p.Hreflang = jsonutil.NonNilHreflang(p.Hreflang)
	if p.JsonLdLocalNapEvidence == nil {
		p.JsonLdLocalNapEvidence = []types.LocalNapEntryEvidence{}
	}
	return p
}
