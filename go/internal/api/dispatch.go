package api

import (
	"bytes"
	"net/http"
	"net/http/httptest"
)

// Dispatch serves an internal HTTP request through the existing mux (no TCP listen).
func (s *Server) Dispatch(method, path string, body []byte) (status int, respBody []byte) {
	var bodyReader *bytes.Reader
	if len(body) > 0 {
		bodyReader = bytes.NewReader(body)
	} else {
		bodyReader = bytes.NewReader(nil)
	}

	req := httptest.NewRequest(method, path, bodyReader)
	if method == http.MethodPost || method == http.MethodPut || method == http.MethodPatch {
		req.Header.Set("Content-Type", "application/json")
	}
	rec := httptest.NewRecorder()
	s.Handler().ServeHTTP(rec, req)
	return rec.Code, rec.Body.Bytes()
}
