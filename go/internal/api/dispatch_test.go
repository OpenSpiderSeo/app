package api

import (
	"net/http"
	"testing"
)

func TestDispatchHealth(t *testing.T) {
	s := NewServer()
	status, body := s.Dispatch(http.MethodGet, "/api/health", nil)
	if status != http.StatusOK {
		t.Fatalf("status=%d body=%s", status, body)
	}
	if len(body) == 0 {
		t.Fatal("empty body")
	}
}

func TestDispatchSetActiveProjectNotFound(t *testing.T) {
	s := NewServer()
	status, _ := s.Dispatch(http.MethodPost, "/api/projects/active", []byte(`{"id":"nonexistent-id"}`))
	if status != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", status)
	}
}
