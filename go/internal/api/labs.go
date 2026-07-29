package api

import (
	"encoding/json"
	"encoding/xml"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/crawl"
	"github.com/openspider/openspider/internal/issues"
)

type sitemapURLSet struct {
	URLs []struct {
		Loc string `xml:"loc"`
	} `xml:"url"`
	Sitemaps []struct {
		Loc string `xml:"loc"`
	} `xml:"sitemap"`
}

func (s *Server) handleExtractSitemap(w http.ResponseWriter, r *http.Request) {
	var input struct {
		URL     string `json:"url"`
		MaxURLs int    `json:"maxUrls"`
	}
	if !decodeJSONBody(w, r, &input) {
		return
	}
	url := strings.TrimSpace(input.URL)
	if url == "" {
		writeAPIErrMsg(w, "url required")
		return
	}
	max := input.MaxURLs
	if max <= 0 {
		max = 5000
	}

	client := &http.Client{Timeout: 20 * time.Second}
	urls, err := fetchSitemapRecursive(client, url, max, map[string]struct{}{})
	if err != nil {
		writeAPIErr(w, err)
		return
	}
	writeJSON(w, map[string]interface{}{
		"ok":       true,
		"source":   url,
		"urlCount": len(urls),
		"urls":     urls,
	})
}

func fetchSitemapRecursive(client *http.Client, sitemapURL string, max int, seen map[string]struct{}) ([]string, error) {
	if _, dup := seen[sitemapURL]; dup {
		return nil, nil
	}
	seen[sitemapURL] = struct{}{}

	resp, err := client.Get(sitemapURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return nil, err
	}

	var set sitemapURLSet
	if err := xml.Unmarshal(body, &set); err != nil {
		re := regexp.MustCompile(`<loc>\s*([^<]+)\s*</loc>`)
		matches := re.FindAllStringSubmatch(string(body), -1)
		var urls []string
		for _, m := range matches {
			if len(urls) >= max {
				break
			}
			loc := strings.TrimSpace(m[1])
			if strings.Contains(strings.ToLower(loc), "sitemap") && strings.HasSuffix(strings.ToLower(loc), ".xml") {
				sub, _ := fetchSitemapRecursive(client, loc, max-len(urls), seen)
				urls = append(urls, sub...)
			} else {
				urls = append(urls, loc)
			}
		}
		return urls, nil
	}

	var urls []string
	for _, sm := range set.Sitemaps {
		if len(urls) >= max {
			break
		}
		sub, _ := fetchSitemapRecursive(client, strings.TrimSpace(sm.Loc), max-len(urls), seen)
		urls = append(urls, sub...)
	}
	for _, u := range set.URLs {
		if len(urls) >= max {
			break
		}
		loc := strings.TrimSpace(u.Loc)
		if loc != "" {
			urls = append(urls, loc)
		}
	}
	return urls, nil
}

func (s *Server) handleCheckMentions(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Keyword string   `json:"keyword"`
		URLs    []string `json:"urls"`
	}
	if !decodeJSONBody(w, r, &input) {
		return
	}
	kw := strings.ToLower(strings.TrimSpace(input.Keyword))
	if kw == "" || len(input.URLs) == 0 {
		writeAPIErrMsg(w, "keyword and urls required")
		return
	}

	client := &http.Client{Timeout: 15 * time.Second}
	type row struct {
		URL     string `json:"url"`
		Found   bool   `json:"found"`
		Count   int    `json:"count"`
		Snippet string `json:"snippet,omitempty"`
		Error   string `json:"error,omitempty"`
	}
	var rows []row
	for _, u := range input.URLs {
		resp, err := client.Get(u)
		if err != nil {
			rows = append(rows, row{URL: u, Error: err.Error()})
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
		resp.Body.Close()
		text := strings.ToLower(string(body))
		count := strings.Count(text, kw)
		snippet := ""
		if idx := strings.Index(text, kw); idx >= 0 {
			start := max(0, idx-40)
			end := min(len(text), idx+len(kw)+80)
			snippet = strings.Join(strings.Fields(text[start:end]), " ")
		}
		rows = append(rows, row{URL: u, Found: count > 0, Count: count, Snippet: snippet})
	}
	writeJSON(w, map[string]interface{}{"ok": true, "keyword": input.Keyword, "results": rows})
}

func (s *Server) handleCheckOutbound(w http.ResponseWriter, r *http.Request) {
	var input crawl.OutboundCheckInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil && err.Error() != "EOF" {
		writeAPIErr(w, err)
		return
	}
	if input.ExternalOnly == false && !input.IncludeInternalUncrawled {
		input.ExternalOnly = true
	}

	state := s.engine.GetState()
	startURL := ""
	if state.Progress.StartURL != nil {
		startURL = *state.Progress.StartURL
	}

	s.engine.ClearIssuesByCode(issues.CodeOutboundBroken)
	result, newIssues := crawl.CheckOutboundLinks(s.engine.GetStoredHTML(), state.Pages, startURL, input)
	added := s.engine.AddIssues(newIssues)

	writeJSON(w, map[string]interface{}{
		"ok":          true,
		"broken":      result.Broken,
		"checked":     result.Checked,
		"skipped":     result.Skipped,
		"issuesAdded": added,
		"error":       result.Error,
	})
}
