package store

import (
	"testing"

	"github.com/openspider/openspider/internal/types"
)

func TestBuildSummaryHealthMatchesLocalMetrics(t *testing.T) {
	state := types.CrawlState{
		Pages: []types.CrawledPage{
			{URL: "https://example.com/", StatusCode: 200, ContentType: strPtr("text/html")},
			{URL: "https://example.com/about", StatusCode: 200, ContentType: strPtr("text/html")},
		},
		Issues: []types.SeoIssue{
			{Severity: types.SeverityWarning, Code: "meta.description.missing", URL: "https://example.com/"},
		},
	}
	summary := buildSummary(state, "https://example.com/")
	if summary.Pages != 2 {
		t.Fatalf("pages = %d, want 2", summary.Pages)
	}
	if summary.Errors != 0 {
		t.Fatalf("errors = %d, want 0", summary.Errors)
	}
	if summary.Warnings != 1 {
		t.Fatalf("warnings = %d, want 1", summary.Warnings)
	}
	if summary.HealthScore != 99 {
		t.Fatalf("healthScore = %d, want 99", summary.HealthScore)
	}
}

func TestHistoryHealthScoreBackfillsFromState(t *testing.T) {
	report := SeoReport{
		Summary: ReportSummary{
			Pages:       2,
			Errors:      0,
			Warnings:    1,
			HealthScore: 0, // legacy save without persisted health
		},
		State: types.CrawlState{
			Pages: []types.CrawledPage{
				{URL: "https://example.com/", StatusCode: 200, ContentType: strPtr("text/html")},
				{URL: "https://example.com/about", StatusCode: 200, ContentType: strPtr("text/html")},
			},
			Issues: []types.SeoIssue{
				{Severity: types.SeverityWarning, Code: "meta.description.missing", URL: "https://example.com/"},
			},
		},
	}
	got := historyHealthScore(report)
	if got == nil || *got != 99 {
		t.Fatalf("historyHealthScore = %v, want 99", got)
	}
}

func TestHistoryHealthScoreZeroPages(t *testing.T) {
	report := SeoReport{}
	got := historyHealthScore(report)
	if got == nil || *got != 0 {
		t.Fatalf("historyHealthScore empty = %v, want 0", got)
	}
}

func strPtr(s string) *string {
	return &s
}
