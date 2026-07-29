package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/openspider/openspider/internal/api"
)

func main() {
	addr := flag.String("addr", ":7845", "HTTP listen address")
	flag.Parse()

	srv := api.NewServer()
	host := *addr
	if host != "" && host[0] == ':' {
		host = "127.0.0.1" + host
	}
	log.Printf("OpenSpider Go engine %s listening on http://%s", api.Version, host)

	httpServer := &http.Server{
		Addr:    *addr,
		Handler: srv.Handler(),
	}

	go func() {
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	ch := make(chan os.Signal, 1)
	signal.Notify(ch, syscall.SIGINT, syscall.SIGTERM)
	<-ch
	fmt.Println("\nShutting down…")
	_ = httpServer.Close()
}
