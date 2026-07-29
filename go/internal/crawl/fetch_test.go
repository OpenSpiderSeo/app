package crawl

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchPageDoesNotFollowRedirect(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/en", http.StatusTemporaryRedirect)
	})
	mux.HandleFunc("/en", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<html><title>EN</title><a href="/en/about">about</a></html>`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)

	client := NewHTTPClient(5000)
	res := FetchPage(context.Background(), client, srv.URL+"/", "OpenSpider-Test")
	if res.StatusCode != http.StatusTemporaryRedirect {
		t.Fatalf("status=%d want 307", res.StatusCode)
	}
	if res.RedirectURL == nil {
		t.Fatal("expected redirect URL")
	}
	want := srv.URL + "/en"
	if *res.RedirectURL != want {
		t.Fatalf("redirect=%q want %q", *res.RedirectURL, want)
	}
	if strings.Contains(res.Body, "<title>EN</title>") {
		t.Fatal("must not fetch redirect body when stopping at 3xx")
	}
}

func TestFetchPageRelativeLocation(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Location", "/ru")
		w.WriteHeader(http.StatusFound)
	}))
	t.Cleanup(srv.Close)

	res := FetchPage(context.Background(), NewHTTPClient(5000), srv.URL+"/", "OpenSpider-Test")
	if res.RedirectURL == nil || *res.RedirectURL != srv.URL+"/ru" {
		t.Fatalf("redirect=%v", res.RedirectURL)
	}
}
