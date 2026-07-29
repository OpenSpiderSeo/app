package audit

import (
	"net/http"
	"strings"
	"testing"
)

func TestScoreFromTTFB(t *testing.T) {
	if scoreFromTTFB(100) < scoreFromTTFB(1500) {
		t.Fatal("faster TTFB should score higher")
	}
}

func TestFetchLocalLabScoresInvalidURL(t *testing.T) {
	out := FetchLocalLabScores("://bad")
	if out.Source != "local-lab" {
		t.Fatalf("source=%q", out.Source)
	}
	if out.Error == nil {
		t.Fatal("expected error for bad url")
	}
}

func TestRunPagespeedPreferLocal(t *testing.T) {
	out := RunPagespeed("https://example.com", nil, true)
	if out.Source != "local-lab" {
		t.Fatalf("source=%q", out.Source)
	}
}

func TestPsiHTTPError429(t *testing.T) {
	msg, code := psiHTTPError(http.StatusTooManyRequests, `{"error":{"code":429}}`, nil)
	if code != "psi_rate_limited" {
		t.Fatalf("code=%q", code)
	}
	if !strings.Contains(msg, "429") {
		t.Fatalf("msg missing 429: %s", msg)
	}
	if strings.Contains(msg, "Показаны локальные") {
		t.Fatalf("psiHTTPError alone must not claim local scores shown: %s", msg)
	}
	if !strings.Contains(msg, "psiApiKey") {
		t.Fatalf("expected psiApiKey hint when no key: %s", msg)
	}
}

func TestWithLocalScoresNote(t *testing.T) {
	base := "Google PageSpeed временно ограничил запросы (HTTP 429)."
	got := withLocalScoresNote(base)
	if !strings.Contains(got, "Показаны локальные") {
		t.Fatalf("expected local claim: %s", got)
	}
	if withLocalScoresNote(got) != got {
		t.Fatal("note must be idempotent")
	}
}

func TestPsiHTTPError429WithKey(t *testing.T) {
	key := "test-key"
	msg, code := psiHTTPError(http.StatusTooManyRequests, "quota", &key)
	if code != "psi_rate_limited" {
		t.Fatalf("code=%q", code)
	}
	if strings.Contains(msg, "psiApiKey") {
		t.Fatalf("should not nag for key when key present: %s", msg)
	}
}

func TestRunPagespeedFallsBackOnRealPSI(t *testing.T) {
	// Live PSI is often 429 without a key — must still return local-lab scores.
	out := RunPagespeed("https://example.com", nil, false)
	if out.Performance == nil {
		t.Fatalf("expected scores after fallback, err=%v", out.Error)
	}
	if out.Source != "local-lab" && out.Source != "pagespeed" {
		t.Fatalf("source=%q", out.Source)
	}
	if out.Source == "local-lab" && out.Error != nil && out.ErrorCode == nil {
		t.Fatal("fallback should set errorCode")
	}
	if out.Source == "local-lab" && out.Error != nil && !strings.Contains(*out.Error, "Показаны локальные") {
		t.Fatalf("fallback note must claim local scores: %s", *out.Error)
	}
}

func TestFetchPagespeedScores429DoesNotClaimLocal(t *testing.T) {
	// Raw PSI fetch (no RunPagespeed) must not lie about local scores.
	out := FetchPagespeedScores("https://example.com", nil)
	if out.Error == nil {
		t.Skip("PSI succeeded without key — cannot assert 429 copy")
	}
	if out.Performance != nil {
		t.Fatal("raw FetchPagespeedScores should not invent scores on error")
	}
	if out.Source != "pagespeed" {
		t.Fatalf("source=%q", out.Source)
	}
	if strings.Contains(*out.Error, "Показаны локальные") {
		t.Fatalf("raw PSI error must not claim local scores: %s", *out.Error)
	}
}

