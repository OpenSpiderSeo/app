package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/openspider/openspider/internal/crawl"
	"github.com/openspider/openspider/internal/store"
	"github.com/openspider/openspider/internal/system"
	"github.com/openspider/openspider/internal/types"
)

const Version = "1.0.0"

type Server struct {
	engine          *crawl.Engine
	sse             *SSEHub
	secrets         types.IntegrationSecrets
	secretsMu       sync.RWMutex
	projects        *store.ProjectStore
	history         *store.HistoryStore
	mux             *http.ServeMux
	extBroadcast    func(eventType string, data interface{})
}

func NewServer() *Server {
	projects := store.NewProjectStore()
	s := &Server{
		sse:      NewSSEHub(),
		projects: projects,
		history:  store.NewHistoryStore(projects),
		mux:      http.NewServeMux(),
	}
	s.engine = crawl.NewEngine(func(eventType string, data interface{}) {
		s.sse.Broadcast(eventType, data)
		if s.extBroadcast != nil {
			s.extBroadcast(eventType, data)
		}
	})
	s.sse.StartKeepalive()
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler {
	return corsMiddleware(s.mux)
}

// SetExtensionBroadcast forwards crawl SSE events to Neutralino extension WebSocket.
func (s *Server) SetExtensionBroadcast(fn func(eventType string, data interface{})) {
	s.extBroadcast = fn
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/app/info", s.handleAppInfo)
	s.mux.HandleFunc("GET /api/events", s.sse.ServeHTTP)

	s.mux.HandleFunc("GET /api/crawl/state", s.handleCrawlState)
	s.mux.HandleFunc("POST /api/crawl/start", s.handleCrawlStart)
	s.mux.HandleFunc("POST /api/crawl/stop", s.handleCrawlStop)
	s.mux.HandleFunc("POST /api/crawl/pause", s.handleCrawlPause)
	s.mux.HandleFunc("POST /api/crawl/resume", s.handleCrawlResume)
	s.mux.HandleFunc("GET /api/crawl/config", s.handleCrawlGetConfig)
	s.mux.HandleFunc("POST /api/crawl/config", s.handleCrawlSaveConfig)
	s.mux.HandleFunc("GET /api/crawl/link-graph", s.handleLinkGraph)

	s.mux.HandleFunc("GET /api/integrations", s.handleIntegrationsList)
	s.mux.HandleFunc("GET /api/secrets", s.handleGetSecrets)
	s.mux.HandleFunc("POST /api/secrets", s.handleSaveSecrets)
	s.mux.HandleFunc("GET /api/oss/credits", s.handleOssCredits)

	s.mux.HandleFunc("POST /api/labs/sitemap", s.handleExtractSitemap)
	s.mux.HandleFunc("POST /api/labs/mentions", s.handleCheckMentions)
	s.mux.HandleFunc("POST /api/labs/outbound", s.handleCheckOutbound)
	s.mux.HandleFunc("POST /api/labs/full-audit", s.handleFullAudit)
	s.mux.HandleFunc("POST /api/labs/pagespeed", s.handlePagespeed)
	s.mux.HandleFunc("POST /api/labs/serp", s.handleSerp)
	s.mux.HandleFunc("POST /api/labs/llms", s.handleProbeLlms)
	s.mux.HandleFunc("GET /api/metrics/local", s.handleLocalMetrics)
	s.mux.HandleFunc("GET /api/system/load", s.handleSystemLoad)
	s.mux.HandleFunc("GET /api/proxy/image", s.handleProxyImage)

	s.mux.HandleFunc("GET /api/history", s.handleListHistory)
	s.mux.HandleFunc("POST /api/history/load", s.handleLoadHistory)
	s.mux.HandleFunc("POST /api/history/delete", s.handleDeleteHistory)
	s.mux.HandleFunc("POST /api/history/save", s.handleSaveHistory)
	s.mux.HandleFunc("GET /api/report/current", s.handleCurrentReport)
	s.mux.HandleFunc("POST /api/report/export-csv-pages", s.handleExportCsvPages)
	s.mux.HandleFunc("POST /api/report/export-csv-issues", s.handleExportCsvIssues)
	s.mux.HandleFunc("POST /api/report/export-sitemap", s.handleExportSitemap)
	s.mux.HandleFunc("GET /api/proxy/image-data", s.handleProxyImageData)

	s.mux.HandleFunc("GET /api/projects", s.handleListProjects)
	s.mux.HandleFunc("GET /api/projects/active", s.handleGetActiveProject)
	s.mux.HandleFunc("POST /api/projects/active", s.handleSetActiveProject)
	s.mux.HandleFunc("POST /api/projects/create", s.handleCreateProject)
	s.mux.HandleFunc("POST /api/projects/update", s.handleUpdateProject)
	s.mux.HandleFunc("POST /api/projects/delete", s.handleDeleteProject)
	s.mux.HandleFunc("GET /api/projects/memory", s.handleListProjectMemory)
	s.mux.HandleFunc("POST /api/projects/memory", s.handleAddProjectMemory)

	s.mux.HandleFunc("POST /api/googlebot/view", s.handleGooglebotView)

	// Stubs — return structured not-implemented for UI graceful degradation
	stub := s.handleNotImplemented
	for _, path := range []string{
		"POST /api/session/save", "POST /api/session/load",
		"POST /api/report/export", "POST /api/report/import",
		"POST /api/labs/ai-scan", "POST /api/metrika/fetch",
		"GET /api/ranks", "POST /api/ranks/save",
		"GET /api/schedule", "POST /api/schedule/save",
		"POST /api/indexnow/submit", "GET /api/head-checklist",
		"POST /api/app/update/check", "POST /api/app/update/install",
	} {
		s.mux.HandleFunc(path, stub)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, map[string]string{"status": "ok"})
}

func (s *Server) handleAppInfo(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, types.AppInfo{
		Name:             "OpenSpider",
		Version:          Version,
		Platform:         runtime.GOOS,
		Engine:           "go",
		UpdatesSupported: false,
	})
}

func (s *Server) handleCrawlState(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, s.engine.GetState())
}

func (s *Server) handleCrawlStart(w http.ResponseWriter, r *http.Request) {
	var opts types.CrawlOptions
	if !decodeJSONBody(w, r, &opts) {
		return
	}
	if err := s.engine.Start(opts); err != nil {
		writeAPIErr(w, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) handleCrawlStop(w http.ResponseWriter, _ *http.Request) {
	s.engine.Stop()
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) handleCrawlGetConfig(w http.ResponseWriter, _ *http.Request) {
	cfg := s.engine.GetConfig()
	cfg.StartURL = ""
	writeJSON(w, cfg)
}

func (s *Server) handleCrawlSaveConfig(w http.ResponseWriter, r *http.Request) {
	var cfg types.CrawlOptions
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.engine.SaveConfig(cfg)
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) handleLinkGraph(w http.ResponseWriter, _ *http.Request) {
	state := s.engine.GetState()
	nodes := make([]map[string]interface{}, 0, len(state.Pages))
	edges := []map[string]string{}
	seen := map[string]struct{}{}
	for _, p := range state.Pages {
		nodes = append(nodes, map[string]interface{}{
			"id":    p.URL,
			"label": labelOf(p),
			"depth": p.Depth,
		})
		seen[p.URL] = struct{}{}
	}
	writeJSON(w, map[string]interface{}{"nodes": nodes, "edges": edges})
}

func labelOf(p types.CrawledPage) string {
	if p.Title != nil && *p.Title != "" {
		t := *p.Title
		if len(t) > 48 {
			return t[:48] + "…"
		}
		return t
	}
	return p.URL
}

func (s *Server) handleIntegrationsList(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, defaultIntegrations())
}

func (s *Server) handleGetSecrets(w http.ResponseWriter, _ *http.Request) {
	s.secretsMu.RLock()
	defer s.secretsMu.RUnlock()
	writeJSON(w, s.secrets)
}

func (s *Server) handleSaveSecrets(w http.ResponseWriter, r *http.Request) {
	var patch types.IntegrationSecrets
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	s.secretsMu.Lock()
	mergeSecrets(&s.secrets, patch)
	out := s.secrets
	s.secretsMu.Unlock()
	writeJSON(w, out)
}

func (s *Server) handleOssCredits(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, ossCredits())
}

func (s *Server) handleSystemLoad(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, system.LoadSnapshot())
}

func (s *Server) handleNotImplemented(w http.ResponseWriter, _ *http.Request) {
	writeJSONStatus(w, http.StatusNotImplemented, map[string]interface{}{
		"ok":      false,
		"error":   "not_implemented",
		"message": "Feature not yet ported to Go engine — planned for a future release",
	})
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func writeJSONStatus(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func mergeSecrets(dst *types.IntegrationSecrets, patch types.IntegrationSecrets) {
	if patch.PSIApiKey != nil {
		dst.PSIApiKey = patch.PSIApiKey
	}
	if patch.MetrikaCounterID != nil {
		dst.MetrikaCounterID = patch.MetrikaCounterID
	}
	if patch.MetrikaOauthToken != nil {
		dst.MetrikaOauthToken = patch.MetrikaOauthToken
	}
	if patch.GscSiteURL != nil {
		dst.GscSiteURL = patch.GscSiteURL
	}
	if patch.OpenaiApiKey != nil {
		dst.OpenaiApiKey = patch.OpenaiApiKey
	}
	if patch.OpenaiBaseURL != nil {
		dst.OpenaiBaseURL = patch.OpenaiBaseURL
	}
	if patch.IndexNowKey != nil {
		dst.IndexNowKey = patch.IndexNowKey
	}
}

// SSEHub broadcasts crawl events to connected clients.
type SSEHub struct {
	mu      sync.RWMutex
	clients map[chan []byte]struct{}
}

func NewSSEHub() *SSEHub {
	return &SSEHub{clients: map[chan []byte]struct{}{}}
}

func (h *SSEHub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan []byte, 32)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clients, ch)
		h.mu.Unlock()
		close(ch)
	}()

	fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
	flusher.Flush()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case msg, open := <-ch:
			if !open {
				return
			}
			w.Write(msg)
			flusher.Flush()
		}
	}
}

func (h *SSEHub) Broadcast(eventType string, data interface{}) {
	payload, err := json.Marshal(data)
	if err != nil {
		return
	}
	msg := []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, payload))
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
		}
	}
}

// Keepalive ping every 30s for proxies.
func (h *SSEHub) StartKeepalive() {
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		for range ticker.C {
			h.mu.RLock()
			for ch := range h.clients {
				select {
				case ch <- []byte(": ping\n\n"):
				default:
				}
			}
			h.mu.RUnlock()
		}
	}()
}
