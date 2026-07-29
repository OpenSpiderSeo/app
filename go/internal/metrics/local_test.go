package metrics

import (
	"testing"

	"github.com/openspider/openspider/internal/types"
)

func TestBuildLocalMetricsStatusBuckets(t *testing.T) {
	state := types.CrawlState{
		Pages: []types.CrawledPage{
			{URL: "https://a.test/1", StatusCode: 200},
			{URL: "https://a.test/2", StatusCode: 301},
			{URL: "https://a.test/3", StatusCode: 404},
		},
		Issues: []types.SeoIssue{},
	}
	snap := BuildLocalMetrics(state)
	if snap.Pages != 3 {
		t.Fatalf("pages=%d", snap.Pages)
	}
	counts := map[string]int{}
	for _, b := range snap.Buckets {
		counts[b.Label] = b.Count
	}
	if counts["2xx"] != 1 || counts["3xx"] != 1 || counts["4xx"] != 1 {
		t.Fatalf("buckets=%v", snap.Buckets)
	}
}
