package api

import (
	"net/http"

	"github.com/openspider/openspider/internal/googlebot"
)

func (s *Server) handleGooglebotView(w http.ResponseWriter, r *http.Request) {
	var req googlebot.Request
	if !decodeJSONBody(w, r, &req) {
		return
	}

	resp, err := googlebot.FetchView(r.Context(), req)
	if err != nil {
		writeAPIErr(w, err)
		return
	}
	writeJSON(w, resp)
}
