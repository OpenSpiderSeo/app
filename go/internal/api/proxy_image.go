package api

import (
	"encoding/base64"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/crawl"
)

const maxProxyImageBytes = 5 << 20 // 5 MiB

func fetchProxyImage(r *http.Request, rawURL string) (contentType string, body []byte, status int, errMsg string) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return "", nil, http.StatusBadRequest, "url required"
	}

	u, err := url.Parse(rawURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return "", nil, http.StatusBadRequest, "invalid url"
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return "", nil, http.StatusBadRequest, "unsupported scheme"
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	if err != nil {
		return "", nil, http.StatusInternalServerError, err.Error()
	}
	req.Header.Set("User-Agent", crawl.DefaultUserAgent)
	req.Header.Set("Accept", "image/*,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		return "", nil, http.StatusBadGateway, err.Error()
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return "", nil, resp.StatusCode, resp.Status
	}

	contentType = resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	baseType := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if baseType != "application/octet-stream" && !strings.HasPrefix(baseType, "image/") {
		return "", nil, http.StatusUnsupportedMediaType, "not an image"
	}

	body, err = io.ReadAll(io.LimitReader(resp.Body, maxProxyImageBytes))
	if err != nil {
		return "", nil, http.StatusBadGateway, err.Error()
	}
	return contentType, body, http.StatusOK, ""
}

func (s *Server) handleProxyImage(w http.ResponseWriter, r *http.Request) {
	ct, body, status, errMsg := fetchProxyImage(r, r.URL.Query().Get("url"))
	if status != http.StatusOK {
		http.Error(w, errMsg, status)
		return
	}
	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "private, max-age=300")
	_, _ = w.Write(body)
}

// JSON+base64 for Neutralino extension RPC (binary responses cannot round-trip as JSON).
func (s *Server) handleProxyImageData(w http.ResponseWriter, r *http.Request) {
	ct, body, status, errMsg := fetchProxyImage(r, r.URL.Query().Get("url"))
	if status != http.StatusOK {
		writeJSONStatus(w, status, map[string]interface{}{"ok": false, "error": errMsg})
		return
	}
	writeJSON(w, map[string]interface{}{
		"ok":          true,
		"contentType": ct,
		"base64":      base64.StdEncoding.EncodeToString(body),
	})
}
