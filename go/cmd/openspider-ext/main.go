package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/openspider/openspider/internal/api"
	"github.com/openspider/openspider/internal/neutralinoext"
)

const extDebug = true

var (
	ext = new(neutralinoext.WSClient)
	srv *api.Server
)

func processAppEvent(data neutralinoext.EventMessage) {
	if !ext.IsEvent(data, "runGo") {
		return
	}
	d, ok := data.Data.(map[string]interface{})
	if !ok {
		return
	}
	fn, _ := d["function"].(string)
	param := d["parameter"]

	switch fn {
	case "rpc":
		handleRPC(param)
	case "health":
		ext.Send("healthResult", map[string]interface{}{"status": "ok"})
	}
}

func handleRPC(param interface{}) {
	raw, err := json.Marshal(param)
	if err != nil {
		sendRPCError("", "invalid parameter")
		return
	}
	var req struct {
		ID     string          `json:"id"`
		Method string          `json:"method"`
		Path   string          `json:"path"`
		Body   json.RawMessage `json:"body"`
	}
	if err := json.Unmarshal(raw, &req); err != nil || req.ID == "" || req.Path == "" {
		sendRPCError("", "invalid rpc payload")
		return
	}

	method := req.Method
	if method == "" {
		method = "GET"
	}

	status, respBody := srv.Dispatch(method, req.Path, req.Body)
	var parsed interface{}
	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &parsed); err != nil {
			parsed = string(respBody)
		}
	}

	ext.Send("rpcResult", map[string]interface{}{
		"id":     req.ID,
		"status": status,
		"body":   parsed,
	})
}

func sendRPCError(id, message string) {
	ext.Send("rpcResult", map[string]interface{}{
		"id":    id,
		"error": message,
	})
}

func main() {
	srv = api.NewServer()
	srv.SetExtensionBroadcast(func(eventType string, data interface{}) {
		ext.Send("crawlEvent", map[string]interface{}{
			"type": eventType,
			"data": data,
		})
	})

	if extDebug {
		fmt.Fprintf(os.Stderr, "OpenSpider Go extension %s (neutralino-ext-go)\n", api.Version)
	}
	ext.Run(processAppEvent, extDebug)
}
