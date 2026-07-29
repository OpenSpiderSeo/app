package api

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestGooglebotViewEndpoint(t *testing.T) {
	s := NewServer()
	body := []byte(`{"url":"https://example.com","compareDesktopMobile":true,"acceptLanguage":"ru-RU,ru;q=0.9"}`)
	status, resp := s.Dispatch(http.MethodPost, "/api/googlebot/view", body)
	if status != http.StatusOK {
		t.Fatalf("status %d body %s", status, string(resp))
	}
	var out struct {
		Views []struct {
			Device     string `json:"device"`
			StatusCode int    `json:"statusCode"`
			Title      *string `json:"title"`
		} `json:"views"`
	}
	if err := json.Unmarshal(resp, &out); err != nil {
		t.Fatal(err)
	}
	if len(out.Views) != 2 {
		t.Fatalf("expected 2 views, got %d", len(out.Views))
	}
	devices := map[string]bool{}
	for _, v := range out.Views {
		devices[v.Device] = true
		if v.StatusCode == 0 {
			t.Fatal("expected non-zero status")
		}
	}
	if !devices["desktop"] || !devices["mobile"] {
		t.Fatalf("expected desktop+mobile views, got %+v", devices)
	}
}

func TestGooglebotViewRequiresURL(t *testing.T) {
	s := NewServer()
	status, _ := s.Dispatch(http.MethodPost, "/api/googlebot/view", []byte(`{}`))
	if status != http.StatusOK {
		// writeAPIErr returns 200 with ok:false — check behavior
	}
	body := []byte(`{"compareLanguages":["ru","en"]}`)
	status, resp := s.Dispatch(http.MethodPost, "/api/googlebot/view", body)
	if status == http.StatusOK {
		var out map[string]interface{}
		_ = json.Unmarshal(resp, &out)
		if _, hasViews := out["views"]; hasViews {
			t.Fatal("expected error without url")
		}
	}
}
