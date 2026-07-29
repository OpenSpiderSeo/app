package crawl

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/openspider/openspider/internal/types"
)

func TestEngineKeepsSeedURLAcrossLocaleRedirect(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		http.Redirect(w, r, "/en", http.StatusTemporaryRedirect)
	})
	mux.HandleFunc("/en", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<!doctype html><html><head><title>Home EN</title></head>
<body><h1>EN</h1><a href="/en/about">About</a></body></html>`))
	})
	mux.HandleFunc("/en/about", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		_, _ = w.Write([]byte(`<!doctype html><html><head><title>About</title></head><body><h1>About</h1></body></html>`))
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)

	eng := NewEngine(nil)
	seed := srv.URL + "/"
	if err := eng.Start(types.CrawlOptions{
		StartURL:       seed,
		MaxConcurrency: 2,
		MaxDepth:       2,
		MaxURLs:        10,
		SameOriginOnly: true,
		FollowLinks:    true,
	}); err != nil {
		t.Fatal(err)
	}
	eng.WaitUntilDone(5 * time.Second)

	state := eng.GetState()
	if state.Progress.StartURL == nil || *state.Progress.StartURL != seed {
		t.Fatalf("startUrl=%v want %q", state.Progress.StartURL, seed)
	}
	if len(state.Pages) < 2 {
		t.Fatalf("pages=%d want at least seed+redirect target", len(state.Pages))
	}

	var seedPage *types.CrawledPage
	var enPage bool
	for i := range state.Pages {
		p := &state.Pages[i]
		if p.URL == seed {
			seedPage = p
		}
		if p.URL == srv.URL+"/en" {
			enPage = true
		}
	}
	if seedPage == nil {
		t.Fatal("seed URL missing from pages")
	}
	if seedPage.StatusCode != http.StatusTemporaryRedirect {
		t.Fatalf("seed status=%d want 307", seedPage.StatusCode)
	}
	if seedPage.RedirectURL == nil || *seedPage.RedirectURL != srv.URL+"/en" {
		t.Fatalf("seed redirect=%v", seedPage.RedirectURL)
	}
	if !enPage {
		t.Fatal("expected redirect target /en to be enqueued and fetched")
	}
}
