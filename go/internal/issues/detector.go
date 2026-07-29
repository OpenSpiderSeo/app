package issues

import (
	"regexp"
	"strings"

	"github.com/openspider/openspider/internal/types"
	"github.com/openspider/openspider/internal/urlutil"
)

const (
	titleMin = 30
	titleMax = 60
	descMin  = 70
	descMax  = 160
	thinWords = 150
	deepDepth = 4
	h2MinWords = 100
)

var infraNoise = regexp.MustCompile(`(?i)(\.(css|js|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|json|xml|pdf|zip|mp4|webm|mp3|avif))(\?|$)`)

func issueID(code, url string) string {
	return code + "::" + url
}

func push(issues *[]types.SeoIssue, code, severity, url, message, domain string, evidence interface{}) {
	*issues = append(*issues, types.SeoIssue{
		ID:       issueID(code, url),
		Code:     code,
		Severity: severity,
		URL:      url,
		Message:  message,
		Domain:   domain,
		Evidence: evidence,
	})
}

func isInfrastructureNoise(url string) bool {
	return infraNoise.MatchString(url)
}

func isAuditableHTML(page types.CrawledPage) bool {
	if page.Error != nil {
		return false
	}
	// 3xx are redirect nodes (seed kept); on-page checks belong on the destination URL.
	if page.StatusCode < 200 || page.StatusCode >= 300 {
		return false
	}
	if page.ContentType != nil {
		ct := strings.ToLower(*page.ContentType)
		if !strings.Contains(ct, "html") && !strings.Contains(ct, "xhtml") {
			return false
		}
	}
	return page.WordCount > 0 || page.Title != nil || len(page.H1) > 0
}

func shouldRunOnPageChecks(page types.CrawledPage) bool {
	return isAuditableHTML(page)
}

func normalizeCompareText(v string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(v)), " "))
}

func metaDescriptionTag(page types.CrawledPage) string {
	if page.MetaDescriptionOnly != nil {
		return strings.TrimSpace(*page.MetaDescriptionOnly)
	}
	return ""
}

func pageURLKey(url string) string {
	if n := urlutil.NormalizeURL(url, ""); n != "" {
		return n
	}
	return url
}

func hasRobotsConflict(robots string) bool {
	parts := strings.FieldsFunc(strings.ToLower(robots), func(r rune) bool {
		return r == ',' || r == ';'
	})
	hasNoindex, hasIndex := false, false
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "noindex" || strings.HasPrefix(p, "noindex:") {
			hasNoindex = true
		}
		if p == "index" || strings.HasPrefix(p, "index:") {
			hasIndex = true
		}
	}
	return hasNoindex && hasIndex
}

func isSoft404Suspect(page types.CrawledPage) bool {
	if page.StatusCode < 200 || page.StatusCode >= 300 {
		return false
	}
	blob := strings.ToLower(strings.Join([]string{
		strVal(page.Title),
		strVal(page.MetaDescription),
		strings.Join(page.H1, " "),
	}, " "))
	patterns := []string{"404", "not found", "page not found", "страница не найдена", "не найдена"}
	for _, p := range patterns {
		if strings.Contains(blob, p) {
			return true
		}
	}
	return false
}

func strVal(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func detectSpellHeuristics(page types.CrawledPage) []string {
	var flags []string
	blob := strings.Join([]string{
		strVal(page.Title),
		strings.Join(page.H1, " "),
		strVal(page.Excerpt),
		strVal(page.MetaDescription),
	}, " ")
	if blob == "" {
		return flags
	}
	if matched, _ := regexp.MatchString(`(?i)(\p{L}{2,})\s+\1`, blob); matched {
		flags = append(flags, "repeated consecutive word")
	}
	if strings.Contains(blob, "!!!") || strings.Contains(blob, "???") {
		flags = append(flags, "excessive punctuation")
	}
	if matched, _ := regexp.MatchString(`\b([A-ZА-ЯЁ]{12,})\b`, blob); matched {
		flags = append(flags, "long ALL-CAPS token")
	}
	if strings.Contains(blob, "   ") {
		flags = append(flags, "multiple spaces")
	}
	if len(flags) > 3 {
		return flags[:3]
	}
	return flags
}

func DetectPageIssues(page types.CrawledPage) []types.SeoIssue {
	var issues []types.SeoIssue
	skipHTTP := isInfrastructureNoise(page.URL)

	if !skipHTTP && page.StatusCode >= 500 {
		push(&issues, CodeHTTPServerError, types.SeverityError, page.URL,
			"Server error HTTP "+itoa(page.StatusCode), DomainTechnical, nil)
	} else if !skipHTTP && page.StatusCode >= 400 {
		push(&issues, CodeHTTPClientError, types.SeverityError, page.URL,
			"Client error HTTP "+itoa(page.StatusCode), DomainTechnical, nil)
	} else if page.StatusCode >= 300 && page.StatusCode < 400 {
		msg := "Redirect HTTP " + itoa(page.StatusCode)
		if page.RedirectURL != nil {
			msg += " → " + *page.RedirectURL
		}
		push(&issues, CodeRedirect, types.SeverityInfo, page.URL, msg, DomainTechnical, nil)
	}

	if !shouldRunOnPageChecks(page) {
		return issues
	}

	if page.Title == nil || strings.TrimSpace(*page.Title) == "" {
		push(&issues, CodeMissingTitle, types.SeverityError, page.URL, "Missing <title>", DomainOnPage, nil)
	} else {
		l := len(*page.Title)
		if l < titleMin {
			push(&issues, CodeTitleTooShort, types.SeverityWarning, page.URL,
				"Title short ("+itoa(l)+" chars; aim 30–60)", DomainOnPage, nil)
		} else if l > titleMax {
			push(&issues, CodeTitleTooLong, types.SeverityInfo, page.URL,
				"Title long ("+itoa(l)+" chars; aim 30–60)", DomainOnPage, nil)
		}
	}

	descTag := metaDescriptionTag(page)
	if descTag == "" {
		if page.MetaDescription != nil && strings.TrimSpace(*page.MetaDescription) != "" {
			push(&issues, CodeMetaDescriptionOgOnly, types.SeverityInfo, page.URL,
				`Only og:description — missing meta name="description"`, DomainOnPage, nil)
		} else {
			push(&issues, CodeMissingMetaDescription, types.SeverityWarning, page.URL,
				"Missing meta description", DomainOnPage, nil)
		}
	} else {
		l := len(descTag)
		if l < descMin {
			push(&issues, CodeMetaDescriptionTooShort, types.SeverityInfo, page.URL,
				"Meta description short ("+itoa(l)+"; aim 70–160)", DomainOnPage, nil)
		} else if l > descMax {
			push(&issues, CodeMetaDescriptionTooLong, types.SeverityInfo, page.URL,
				"Meta description long ("+itoa(l)+"; aim 70–160)", DomainOnPage, nil)
		}
	}

	if page.Title != nil && len(page.H1) == 1 {
		if normalizeCompareText(*page.Title) == normalizeCompareText(page.H1[0]) {
			push(&issues, CodeTitleH1Duplicate, types.SeverityInfo, page.URL,
				"Title and H1 are identical — consider differentiating", DomainOnPage, nil)
		}
	}
	if page.Title != nil && descTag != "" {
		if normalizeCompareText(*page.Title) == normalizeCompareText(descTag) {
			push(&issues, CodeTitleDescDuplicate, types.SeverityInfo, page.URL,
				"Title and meta description are identical", DomainOnPage, nil)
		}
	}

	if len(page.H1) == 0 {
		push(&issues, CodeMissingH1, types.SeverityWarning, page.URL, "Missing H1", DomainOnPage, nil)
	} else if len(page.H1) > 1 {
		push(&issues, CodeMultipleH1, types.SeverityInfo, page.URL,
			"Multiple H1 ("+itoa(len(page.H1))+")", DomainOnPage, nil)
	}

	if page.WordCount > h2MinWords && page.H2Count == 0 {
		push(&issues, CodeMissingH2, types.SeverityInfo, page.URL,
			"No H2 on content-rich page (~"+itoa(page.WordCount)+" words)", DomainOnPage, nil)
	}

	if page.Canonical == nil {
		push(&issues, CodeMissingCanonical, types.SeverityInfo, page.URL, "Missing canonical link", DomainTechnical, nil)
	} else if !urlutil.SameOrigin(*page.Canonical, page.URL) {
		push(&issues, CodeCanonicalOffOrigin, types.SeverityWarning, page.URL,
			"Canonical points off-origin: "+*page.Canonical, DomainTechnical, nil)
	} else if pageURLKey(page.URL) != pageURLKey(*page.Canonical) {
		push(&issues, CodeCanonicalSelfMismatch, types.SeverityInfo, page.URL,
			"Canonical points to a different URL on this site: "+*page.Canonical, DomainTechnical, nil)
	}

	if page.RobotsMeta != nil && strings.Contains(strings.ToLower(*page.RobotsMeta), "noindex") {
		push(&issues, CodeNoindex, types.SeverityWarning, page.URL,
			"robots meta contains noindex ("+*page.RobotsMeta+")", DomainTechnical, nil)
		if page.Canonical != nil && pageURLKey(page.URL) != pageURLKey(*page.Canonical) {
			push(&issues, CodeCanonicalNoindexMismatch, types.SeverityWarning, page.URL,
				"noindex page canonicalizes to a different URL: "+*page.Canonical, DomainTechnical, nil)
		}
	}
	if page.RobotsMeta != nil && hasRobotsConflict(*page.RobotsMeta) {
		push(&issues, CodeRobotsMetaConflict, types.SeverityError, page.URL,
			"Conflicting robots directives ("+*page.RobotsMeta+")", DomainTechnical, nil)
	}
	if page.RobotsMeta != nil && regexp.MustCompile(`(?i)\bnofollow\b`).MatchString(*page.RobotsMeta) {
		push(&issues, CodeRobotsNofollow, types.SeverityInfo, page.URL,
			"robots meta contains nofollow ("+*page.RobotsMeta+")", DomainTechnical, nil)
	}

	if page.WordCount > 0 && page.WordCount < thinWords {
		push(&issues, CodeThinContent, types.SeverityWarning, page.URL,
			"Thin content (~"+itoa(page.WordCount)+" words)", DomainContent, nil)
	}
	if isSoft404Suspect(page) {
		push(&issues, CodeSoft404, types.SeverityError, page.URL,
			"Soft-404 suspect: HTTP 200 with \"not found\" signals", DomainTechnical, nil)
	}
	if page.WordCount >= 400 && page.JsonLdCount == 0 && page.H2Count < 2 && page.Error == nil &&
		page.StatusCode >= 200 && page.StatusCode < 300 {
		push(&issues, CodeWeakCitability, types.SeverityInfo, page.URL,
			"Weak citability: long page without JSON-LD and few H2 headings", DomainContent, nil)
	}

	if flags := detectSpellHeuristics(page); len(flags) > 0 {
		push(&issues, CodeSpellHeuristic, types.SeverityInfo, page.URL,
			"Content polish: "+strings.Join(flags, "; "), DomainContent, nil)
	}

	if page.OgTitle == nil {
		push(&issues, CodeMissingOgTitle, types.SeverityInfo, page.URL,
			"Missing og:title / twitter:title", DomainOnPage, nil)
	}
	if page.OgImage == nil {
		push(&issues, CodeMissingOgImage, types.SeverityInfo, page.URL,
			"Missing og:image / twitter:image", DomainOnPage, nil)
	}
	if page.TwitterCard == nil && page.OgTitleOnly == nil {
		push(&issues, CodeMissingTwitterCard, types.SeverityInfo, page.URL,
			"Missing twitter:card and og:title", DomainOnPage, nil)
	}

	if page.JsonLdCount == 0 {
		push(&issues, CodeMissingJsonLd, types.SeverityInfo, page.URL, "No JSON-LD structured data", DomainStructuredData, nil)
	} else if page.JsonLdInvalid {
		push(&issues, CodeInvalidJsonLd, types.SeverityWarning, page.URL, "Invalid JSON-LD block(s)", DomainStructuredData, nil)
	} else if len(page.JsonLdTypes) == 0 {
		push(&issues, CodeWeakJsonLd, types.SeverityInfo, page.URL, "JSON-LD present but no @type detected", DomainStructuredData, nil)
	}
	if page.JsonLdLocalNapIncomplete && len(page.JsonLdLocalNapEvidence) > 0 {
		push(&issues, CodeLocalNapIncomplete, types.SeverityWarning, page.URL,
			"LocalBusiness/Organization JSON-LD missing telephone or address", DomainLocal, map[string]interface{}{
				"kind":             "local_nap",
				"entries":            page.JsonLdLocalNapEvidence,
				"jsonLdBlockCount": page.JsonLdCount,
			})
	}

	if page.WordCount >= 400 && page.ImagesTotal == 0 {
		push(&issues, CodeContentNoImages, types.SeverityInfo, page.URL,
			"Long content (~"+itoa(page.WordCount)+" words) without images", DomainContent, nil)
	}
	if page.ImagesMissingAlt > 0 {
		push(&issues, CodeImagesMissingAlt, types.SeverityWarning, page.URL,
			itoa(page.ImagesMissingAlt)+"/"+itoa(page.ImagesTotal)+" images missing alt", DomainAccessibility, nil)
	}
	if page.ImagesTotal >= 2 && page.ImagesMissingAlt == page.ImagesTotal {
		push(&issues, CodeImagesAllMissingAlt, types.SeverityWarning, page.URL,
			"All "+itoa(page.ImagesTotal)+" images missing alt text", DomainAccessibility, nil)
	}
	if page.ButtonsWithoutName > 0 {
		push(&issues, CodeButtonsWithoutName, types.SeverityWarning, page.URL,
			itoa(page.ButtonsWithoutName)+" button(s) without accessible name", DomainAccessibility, nil)
	}
	if page.LinksWithoutAccessibleName > 0 {
		push(&issues, CodeLinksWithoutAccessibleName, types.SeverityWarning, page.URL,
			itoa(page.LinksWithoutAccessibleName)+" link(s) without accessible name", DomainAccessibility, nil)
	}
	if !page.HasSkipLink {
		push(&issues, CodeMissingSkipLink, types.SeverityInfo, page.URL, "No skip navigation link detected", DomainAccessibility, nil)
	}
	if !page.HasViewport {
		push(&issues, CodeMissingViewport, types.SeverityWarning, page.URL, "Missing meta viewport (mobile)", DomainTechnical, nil)
	}
	if page.HTMLLang == nil {
		push(&issues, CodeMissingHTMLLang, types.SeverityInfo, page.URL, "Missing html[lang] attribute", DomainAccessibility, nil)
	}
	if len(page.Hreflang) == 0 && page.Depth == 0 {
		push(&issues, CodeMissingHreflang, types.SeverityInfo, page.URL,
			"No hreflang annotations on start URL (ok if monolingual)", DomainInternational, nil)
	}
	if page.Depth >= deepDepth {
		push(&issues, CodeDeepPage, types.SeverityInfo, page.URL,
			"Deep in site architecture (depth "+itoa(page.Depth)+")", DomainLinks, nil)
	}

	return issues
}

func DetectSitewideIssues(pages []types.CrawledPage) []types.SeoIssue {
	var issues []types.SeoIssue
	issues = append(issues, detectDuplicateField(pages, "title", CodeDuplicateTitle, "Duplicate title")...)
	issues = append(issues, detectDuplicateField(pages, "description", CodeDuplicateMetaDescription, "Duplicate meta description")...)
	issues = append(issues, detectExactDuplicates(pages)...)
	issues = append(issues, detectOrphanPages(pages)...)
	issues = append(issues, detectHreflangReciprocal(pages)...)
	return issues
}

func detectDuplicateField(pages []types.CrawledPage, field, code, label string) []types.SeoIssue {
	byValue := map[string][]string{}
	for _, page := range pages {
		if !isAuditableHTML(page) {
			continue
		}
		var value string
		if field == "title" && page.Title != nil {
			value = *page.Title
		} else if field == "description" && page.MetaDescription != nil {
			value = *page.MetaDescription
		}
		if value == "" {
			continue
		}
		byValue[value] = append(byValue[value], page.URL)
	}
	var issues []types.SeoIssue
	for value, urls := range byValue {
		if len(urls) < 2 {
			continue
		}
		snippet := value
		if len(snippet) > 80 {
			snippet = snippet[:80]
		}
		for _, url := range urls {
			push(&issues, code, types.SeverityWarning, url,
				label+": \""+snippet+"\" ("+itoa(len(urls))+" pages)", DomainOnPage, nil)
		}
	}
	return issues
}

func detectOrphanPages(pages []types.CrawledPage) []types.SeoIssue {
	var issues []types.SeoIssue
	for _, page := range pages {
		if !isAuditableHTML(page) || page.Depth == 0 || page.Inlinks > 0 {
			continue
		}
		push(&issues, CodeOrphanPage, types.SeverityWarning, page.URL,
			"Orphan page (0 internal inlinks discovered)", DomainLinks, map[string]interface{}{
				"kind":    "orphan",
				"inlinks": page.Inlinks,
				"depth":   page.Depth,
			})
	}
	return issues
}

func detectExactDuplicates(pages []types.CrawledPage) []types.SeoIssue {
	byHash := map[string][]string{}
	for _, page := range pages {
		if page.ExactContentHash == nil || !isAuditableHTML(page) || page.WordCount < 30 {
			continue
		}
		byHash[*page.ExactContentHash] = append(byHash[*page.ExactContentHash], page.URL)
	}
	var issues []types.SeoIssue
	for _, urls := range byHash {
		if len(urls) < 2 {
			continue
		}
		for _, url := range urls {
			push(&issues, CodeExactDuplicate, types.SeverityWarning, url,
				"Exact duplicate content ("+itoa(len(urls))+" pages)", DomainContent, nil)
		}
	}
	return issues
}

func detectHreflangReciprocal(pages []types.CrawledPage) []types.SeoIssue {
	byURL := map[string]types.CrawledPage{}
	for _, page := range pages {
		if isAuditableHTML(page) {
			byURL[pageURLKey(page.URL)] = page
		}
	}
	seen := map[string]struct{}{}
	var issues []types.SeoIssue
	for _, page := range pages {
		if !isAuditableHTML(page) {
			continue
		}
		sourceKey := pageURLKey(page.URL)
		for _, ref := range page.Hreflang {
			targetKey := pageURLKey(ref.Href)
			if targetKey == sourceKey {
				continue
			}
			targetPage, ok := byURL[targetKey]
			if !ok {
				continue
			}
			pair := sourceKey + "::" + targetKey
			if sourceKey > targetKey {
				pair = targetKey + "::" + sourceKey
			}
			if _, dup := seen[pair]; dup {
				continue
			}
			reciprocal := false
			for _, h := range targetPage.Hreflang {
				if pageURLKey(h.Href) == sourceKey {
					reciprocal = true
					break
				}
			}
			if reciprocal {
				continue
			}
			seen[pair] = struct{}{}
			issues = append(issues, types.SeoIssue{
				ID:       CodeHreflangNotReciprocal + "::" + page.URL + "::" + ref.Href,
				Code:     CodeHreflangNotReciprocal,
				Severity: types.SeverityWarning,
				URL:      page.URL,
				Message:  "Hreflang to " + ref.Href + " (" + ref.Lang + ") is not reciprocated among crawled pages",
				Domain:   DomainInternational,
			})
		}
	}
	return issues
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
