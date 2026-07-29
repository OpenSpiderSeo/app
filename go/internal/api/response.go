package api

import (
	"encoding/json"
	"net/http"
)

func writeAPIErr(w http.ResponseWriter, err error) {
	writeJSON(w, map[string]interface{}{"ok": false, "error": err.Error()})
}

func writeAPIErrMsg(w http.ResponseWriter, msg string) {
	writeJSON(w, map[string]interface{}{"ok": false, "error": msg})
}

func decodeJSONBody(w http.ResponseWriter, r *http.Request, v interface{}) bool {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeAPIErr(w, err)
		return false
	}
	return true
}
