package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleProxyImageRejectsMissingURL(t *testing.T) {
	s := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/api/proxy/image", nil)
	rec := httptest.NewRecorder()
	s.handleProxyImage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestHandleProxyImageRejectsNonHTTPScheme(t *testing.T) {
	s := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/api/proxy/image?url=file:///etc/passwd", nil)
	rec := httptest.NewRecorder()
	s.handleProxyImage(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rec.Code)
	}
}

func TestHandleProxyImageProxiesImage(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "image/png")
		_, _ = w.Write([]byte{0x89, 0x50, 0x4e, 0x47})
	}))
	defer upstream.Close()

	s := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/api/proxy/image?url="+upstream.URL+"/og.png", nil)
	rec := httptest.NewRecorder()
	s.handleProxyImage(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body=%q", rec.Code, rec.Body.String())
	}
	if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
		t.Fatalf("content-type = %q, want image/png", ct)
	}
	if rec.Body.Len() != 4 {
		t.Fatalf("body len = %d, want 4", rec.Body.Len())
	}
}
