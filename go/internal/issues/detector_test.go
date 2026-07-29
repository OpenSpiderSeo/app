package issues

import (
	"testing"

	"github.com/openspider/openspider/internal/types"
)

func str(s string) *string { return &s }

func TestDetectPageIssues_MissingTitle(t *testing.T) {
	page := types.CrawledPage{
		URL:        "https://example.com/",
		StatusCode: 200,
		WordCount:  200,
		H1:         []string{"Hello"},
	}
	issues := DetectPageIssues(page)
	found := false
	for _, i := range issues {
		if i.Code == CodeMissingTitle {
			found = true
		}
	}
	if !found {
		t.Fatal("expected missing title issue")
	}
}

func TestDetectPageIssues_ThinContent(t *testing.T) {
	page := types.CrawledPage{
		URL:        "https://example.com/page",
		StatusCode: 200,
		Title:      str("Short page title here for SEO"),
		H1:         []string{"Heading"},
		WordCount:  50,
	}
	issues := DetectPageIssues(page)
	found := false
	for _, i := range issues {
		if i.Code == CodeThinContent {
			found = true
		}
	}
	if !found {
		t.Fatal("expected thin content issue")
	}
}

func TestDetectDuplicateTitles(t *testing.T) {
	pages := []types.CrawledPage{
		{URL: "https://example.com/a", StatusCode: 200, Title: str("Same Title"), WordCount: 300, H1: []string{"H"}},
		{URL: "https://example.com/b", StatusCode: 200, Title: str("Same Title"), WordCount: 300, H1: []string{"H"}},
	}
	issues := DetectSitewideIssues(pages)
	dup := 0
	for _, i := range issues {
		if i.Code == CodeDuplicateTitle {
			dup++
		}
	}
	if dup < 2 {
		t.Fatalf("expected duplicate title on both pages, got %d", dup)
	}
}

func TestDetectOrphanPage(t *testing.T) {
	pages := []types.CrawledPage{
		{URL: "https://example.com/", StatusCode: 200, Depth: 0, WordCount: 300, H1: []string{"H"}},
		{URL: "https://example.com/orphan", StatusCode: 200, Depth: 2, Inlinks: 0, WordCount: 300, H1: []string{"H"}},
	}
	issues := DetectSitewideIssues(pages)
	found := false
	for _, i := range issues {
		if i.Code == CodeOrphanPage {
			found = true
		}
	}
	if !found {
		t.Fatal("expected orphan page issue")
	}
}
