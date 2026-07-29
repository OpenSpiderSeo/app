// Package neutralinoext — Neutralino Go extension WebSocket client.
// Based on https://github.com/hschneider/neutralino-ext-go (MIT, Harald Schneider).
package neutralinoext

import (
	"encoding/json"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/signal"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const Version = "1.0.5"

type Config struct {
	NlPort         string `json:"nlPort"`
	NlToken        string `json:"nlToken"`
	NlExtensionId  string `json:"nlExtensionId"`
	NlConnectToken string `json:"nlConnectToken"`
}

type EventMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

type DataPacket struct {
	Id          string       `json:"id"`
	Method      string       `json:"method"`
	AccessToken string       `json:"accessToken"`
	Data        EventMessage `json:"data"`
}

type WSClient struct {
	url     url.URL
	socket  *websocket.Conn
	debug   bool
	writeMu sync.Mutex // gorilla/websocket Conn allows one writer at a time
}

var ExtConfig Config

func (wsclient *WSClient) Send(event string, data map[string]interface{}) {
	var msg DataPacket
	msg.Id = uuid.New().String()
	msg.Method = "app.broadcast"
	msg.AccessToken = ExtConfig.NlToken
	msg.Data.Event = event
	msg.Data.Data = data

	d, err := json.Marshal(msg)
	if err != nil {
		fmt.Println("Error in marshaling data-packet.")
		return
	}

	if wsclient.debug {
		fmt.Printf("%sSent: %s%s\n", "\u001B[32m", string(d), "\u001B[0m")
	}

	wsclient.writeMu.Lock()
	defer wsclient.writeMu.Unlock()
	if wsclient.socket == nil {
		return
	}
	err = wsclient.socket.WriteMessage(websocket.TextMessage, d)
	if err != nil && wsclient.debug {
		fmt.Println("Error in Send(): ", err)
	}
}

func (wsclient *WSClient) SendMessageString(event string, data string) {
	msg := make(map[string]interface{})
	msg["result"] = data
	wsclient.Send(event, msg)
}

func (wsclient *WSClient) Run(callback func(message EventMessage), debug bool) {
	wsclient.debug = debug

	decoder := json.NewDecoder(os.Stdin)
	err := decoder.Decode(&ExtConfig)
	if err != nil && err != io.EOF {
		fmt.Println(err)
	}

	sigInt := make(chan os.Signal, 1)
	if debug {
		signal.Notify(sigInt, os.Interrupt)
	}

	addr := "127.0.0.1:" + ExtConfig.NlPort
	path := "?extensionId=" + ExtConfig.NlExtensionId + "&connectToken=" + ExtConfig.NlConnectToken

	wsclient.url = url.URL{Scheme: "ws", Host: addr, Path: path}
	if wsclient.debug {
		fmt.Printf("Connecting to %s\n", wsclient.url.String())
	}

	wsclient.socket, _, err = websocket.DefaultDialer.Dial(wsclient.url.String(), nil)
	if err != nil {
		if wsclient.debug {
			fmt.Println("Connect: ", err)
		}
	}
	defer func() {
		wsclient.writeMu.Lock()
		defer wsclient.writeMu.Unlock()
		if wsclient.socket != nil {
			_ = wsclient.socket.Close()
		}
	}()

	go func() {
		for {
			_, msg, err := wsclient.socket.ReadMessage()
			if err != nil {
				if wsclient.debug {
					fmt.Println("ERROR in read loop: ", err)
				}
				continue
			}
			if wsclient.debug {
				fmt.Printf("%sReceived: %s%s\n", "\u001B[91m", msg, "\u001B[0m")
			}

			var d EventMessage
			err = json.Unmarshal(msg, &d)
			if err != nil {
				if wsclient.debug {
					fmt.Println("ERROR in read loop, while unmarshalling JSON: ", err)
				}
				continue
			}

			if wsclient.IsEvent(d, "windowClose") || wsclient.IsEvent(d, "appClose") {
				wsclient.quit()
				continue
			}

			callback(d)
		}
	}()

	for range sigInt {
		fmt.Println("Interrupted by keyboard interaction ...")
		wsclient.quit()
	}
}

func (wsclient *WSClient) IsEvent(data EventMessage, event string) bool {
	return data.Event == event
}

func (wsclient *WSClient) quit() {
	pid := os.Getpid()
	fmt.Println("Killing own process with PID ", pid)
	process, _ := os.FindProcess(pid)
	_ = process.Signal(os.Kill)
}
