package metrics

import "github.com/openspider/openspider/internal/types"

func isOkHTML(page types.CrawledPage) bool {
	if page.Error != nil || page.StatusCode < 200 || page.StatusCode >= 300 {
		return false
	}
	if page.ContentType == nil {
		return true
	}
	ct := *page.ContentType
	return contains(ct, "text/html") || contains(ct, "application/xhtml")
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		(len(s) > 0 && indexFold(s, sub) >= 0))
}

func indexFold(s, sub string) int {
	// simple case-insensitive contains check for content-type
	for i := 0; i+len(sub) <= len(s); i++ {
		match := true
		for j := 0; j < len(sub); j++ {
			a, b := s[i+j], sub[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				match = false
				break
			}
		}
		if match {
			return i
		}
	}
	return -1
}

// ComputeHealthScore mirrors shared/utils/seo-audit.utils computeHealthScore (simplified).
func ComputeHealthScore(errors, warnings, okPages int) int {
	score := 100.0 - float64(errors)*6 - float64(warnings)*1.5
	if okPages == 0 {
		score -= 20
	}
	if score < 0 {
		return 0
	}
	if score > 100 {
		return 100
	}
	return int(score + 0.5)
}

// ComputeFixProgress mirrors shared/utils/fix-progress.utils.
// Snapshot score from open crawl issues (not resolved-over-time tracking).
func ComputeFixProgress(issues []types.SeoIssue) int {
	errors, warnings := 0, 0
	for _, i := range issues {
		switch i.Severity {
		case types.SeverityError:
			errors++
		case types.SeverityWarning:
			warnings++
		}
	}
	if errors == 0 && warnings == 0 {
		return 100
	}
	remaining := float64(errors)*6 + float64(warnings)*1.5
	if remaining > 100 {
		remaining = 100
	}
	return int(100 - remaining + 0.5)
}
