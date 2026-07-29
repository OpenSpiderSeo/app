package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestFetchSitemapRecursiveUrlset(t *testing.T) {
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/a</loc></url>
  <url><loc>https://example.com/b</loc></url>
</urlset>`
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		_, _ = w.Write([]byte(body))
	}))
	defer srv.Close()

	urls, err := fetchSitemapRecursive(srv.Client(), srv.URL+"/sitemap.xml", 100, map[string]struct{}{})
	if err != nil {
		t.Fatal(err)
	}
	if len(urls) != 2 {
		t.Fatalf("got %d urls: %v", len(urls), urls)
	}
	if urls[0] != "https://example.com/a" || urls[1] != "https://example.com/b" {
		t.Fatalf("unexpected urls: %v", urls)
	}
}

func TestFetchSitemapRecursiveIndex(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/sitemap.xml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		_, _ = w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>` + "http://" + r.Host + `/child.xml</loc></sitemap>
</sitemapindex>`))
	})
	mux.HandleFunc("/child.xml", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/xml")
		_, _ = w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/from-index</loc></url>
</urlset>`))
	})
	srv := httptest.NewServer(mux)
	defer srv.Close()

	urls, err := fetchSitemapRecursive(srv.Client(), srv.URL+"/sitemap.xml", 100, map[string]struct{}{})
	if err != nil {
		t.Fatal(err)
	}
	if len(urls) != 1 || urls[0] != "https://example.com/from-index" {
		t.Fatalf("unexpected urls: %v", urls)
	}
}

func TestHandleExtractSitemap(t *testing.T) {
	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/x</loc></url>
</urlset>`
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(body))
	}))
	defer upstream.Close()

	s := NewServer()
	payload := []byte(`{"url":"` + upstream.URL + `/sitemap.xml"}`)
	status, resp := s.Dispatch(http.MethodPost, "/api/labs/sitemap", payload)
	if status != http.StatusOK {
		t.Fatalf("status=%d body=%s", status, resp)
	}
	if !strings.Contains(string(resp), `"urlCount":1`) {
		t.Fatalf("expected urlCount 1, body=%s", resp)
	}
	if !strings.Contains(string(resp), `https://example.com/x`) {
		t.Fatalf("missing url in body=%s", resp)
	}
}
