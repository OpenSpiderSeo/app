package api

import (
	"net/http"
	"strings"

	"github.com/openspider/openspider/internal/audit"
	"github.com/openspider/openspider/internal/metrics"
)

func (s *Server) handleFullAudit(w http.ResponseWriter, r *http.Request) {
	var input audit.FullAuditInput
	if !decodeJSONBody(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.URL) == "" {
		writeAPIErrMsg(w, "url required")
		return
	}

	s.secretsMu.RLock()
	psiKey := s.secrets.PSIApiKey
	s.secretsMu.RUnlock()

	result := audit.RunFullAudit(s.engine, input, psiKey)
	writeJSON(w, result)
}

func (s *Server) handlePagespeed(w http.ResponseWriter, r *http.Request) {
	var input struct {
		URL         string `json:"url"`
		PreferLocal bool   `json:"preferLocal"`
	}
	if !decodeJSONBody(w, r, &input) {
		return
	}
	url := strings.TrimSpace(input.URL)
	if url == "" {
		writeAPIErrMsg(w, "url required")
		return
	}
	s.secretsMu.RLock()
	psiKey := s.secrets.PSIApiKey
	s.secretsMu.RUnlock()
	writeJSON(w, audit.RunPagespeed(url, psiKey, input.PreferLocal))
}

func (s *Server) handleSerp(w http.ResponseWriter, r *http.Request) {
	var input struct {
		URL     string `json:"url"`
		Keyword string `json:"keyword"`
	}
	if !decodeJSONBody(w, r, &input) {
		return
	}
	url := strings.TrimSpace(input.URL)
	if url == "" {
		writeAPIErrMsg(w, "url required")
		return
	}
	cfg := s.engine.GetConfig()
	ua := cfg.UserAgent
	writeJSON(w, audit.AnalyzeSerp(url, input.Keyword, ua))
}

func (s *Server) handleProbeLlms(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Origin string `json:"origin"`
	}
	if !decodeJSONBody(w, r, &input) {
		return
	}
	origin := strings.TrimSpace(input.Origin)
	if origin == "" {
		writeAPIErrMsg(w, "origin required")
		return
	}
	cfg := s.engine.GetConfig()
	result := audit.ProbeLlmsTxt(origin, cfg.UserAgent)
	writeJSON(w, map[string]interface{}{
		"url":        result.URL,
		"found":      result.OK,
		"statusCode": result.Status,
		"bytes":      0,
		"preview":    nil,
	})
}

func (s *Server) handleLocalMetrics(w http.ResponseWriter, _ *http.Request) {
	state := s.engine.GetState()
	writeJSON(w, metrics.BuildLocalMetrics(state))
}
