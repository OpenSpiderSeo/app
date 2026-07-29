package api

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/openspider/openspider/internal/audit"
)

func TestDispatchFullAuditMinimal(t *testing.T) {
	s := NewServer()
	body := []byte(`{"url":"https://example.com","keyword":"example","runCrawl":false}`)
	status, resp := s.Dispatch(http.MethodPost, "/api/labs/full-audit", body)
	if status != http.StatusOK {
		t.Fatalf("status=%d body=%s", status, resp)
	}
	var result audit.FullAuditResult
	if err := json.Unmarshal(resp, &result); err != nil {
		t.Fatal(err)
	}
	if result.URL != "https://example.com" {
		t.Fatalf("url=%q", result.URL)
	}
	if len(result.Sections) < 5 {
		t.Fatalf("expected sections, got %d", len(result.Sections))
	}
	if result.Local == nil {
		t.Fatal("expected local metrics")
	}
}

func TestDispatchLocalMetrics(t *testing.T) {
	s := NewServer()
	status, body := s.Dispatch(http.MethodGet, "/api/metrics/local", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d", status)
	}
	if len(body) == 0 {
		t.Fatal("empty body")
	}
}
