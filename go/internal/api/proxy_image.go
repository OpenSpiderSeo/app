package api

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/crawl"
)

const maxProxyImageBytes = 5 << 20 // 5 MiB

func (s *Server) handleProxyImage(w http.ResponseWriter, r *http.Request) {
	rawURL := strings.TrimSpace(r.URL.Query().Get("url"))
	if rawURL == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	u, err := url.Parse(rawURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		http.Error(w, "invalid url", http.StatusBadRequest)
		return
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		http.Error(w, "unsupported scheme", http.StatusBadRequest)
		return
	}

	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, u.String(), nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", crawl.DefaultUserAgent)
	req.Header.Set("Accept", "image/*,*/*;q=0.8")

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		http.Error(w, resp.Status, resp.StatusCode)
		return
	}

	contentType := resp.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	baseType := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	if baseType != "application/octet-stream" && !strings.HasPrefix(baseType, "image/") {
		http.Error(w, "not an image", http.StatusUnsupportedMediaType)
		return
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", "private, max-age=300")
	_, _ = io.Copy(w, io.LimitReader(resp.Body, maxProxyImageBytes))
}
