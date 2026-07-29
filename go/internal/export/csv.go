package export

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/openspider/openspider/internal/types"
)

func escapeCsv(value interface{}) string {
	s := ""
	if value != nil {
		s = fmt.Sprint(value)
	}
	if regexp.MustCompile(`[",\n\r]`).MatchString(s) {
		return `"` + strings.ReplaceAll(s, `"`, `""`) + `"`
	}
	return s
}

func rowsToCsv(headers []string, rows [][]interface{}) string {
	lines := []string{strings.Join(headers, ",")}
	for _, row := range rows {
		cells := make([]string, len(row))
		for i, v := range row {
			cells[i] = escapeCsv(v)
		}
		lines = append(lines, strings.Join(cells, ","))
	}
	return strings.Join(lines, "\n")
}

func hostSlug(startURL string) string {
	re := regexp.MustCompile(`https?://([^/]+)`)
	m := re.FindStringSubmatch(startURL)
	if len(m) < 2 {
		return "site"
	}
	return regexp.MustCompile(`\W+`).ReplaceAllString(m[1], "_")
}

func strVal(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func BuildPagesCsv(pages []types.CrawledPage) string {
	headers := []string{
		"url", "statusCode", "indexability", "title", "titleLength", "metaDescription",
		"descriptionLength", "h1", "h2Count", "canonical", "robotsMeta", "htmlLang",
		"wordCount", "depth", "inlinks", "outlinks", "jsonLdCount", "hasViewport",
		"imagesTotal", "imagesMissingAlt", "redirectUrl", "contentType", "fetchedAt",
	}
	var rows [][]interface{}
	for _, p := range pages {
		noindex := false
		if p.RobotsMeta != nil {
			noindex = regexp.MustCompile(`(?i)\bnoindex\b`).MatchString(*p.RobotsMeta)
		}
		blocked := p.Error != nil || p.StatusCode >= 300
		indexability := "index"
		if blocked {
			indexability = "blocked"
		} else if noindex {
			indexability = "noindex"
		}
		titleLen := 0
		if p.Title != nil {
			titleLen = len(strings.TrimSpace(*p.Title))
		}
		descLen := 0
		if p.MetaDescription != nil {
			descLen = len(strings.TrimSpace(*p.MetaDescription))
		}
		rows = append(rows, []interface{}{
			p.URL, p.StatusCode, indexability, strVal(p.Title), titleLen,
			strVal(p.MetaDescription), descLen, strings.Join(p.H1, "|"), p.H2Count,
			strVal(p.Canonical), strVal(p.RobotsMeta), strVal(p.HTMLLang),
			p.WordCount, p.Depth, p.Inlinks, p.Outlinks, p.JsonLdCount, p.HasViewport,
			p.ImagesTotal, p.ImagesMissingAlt, strVal(p.RedirectURL), strVal(p.ContentType), p.FetchedAt,
		})
	}
	return rowsToCsv(headers, rows)
}

func BuildIssuesCsv(issues []types.SeoIssue) string {
	headers := []string{"url", "code", "severity", "message", "domain"}
	var rows [][]interface{}
	for _, i := range issues {
		rows = append(rows, []interface{}{i.URL, i.Code, i.Severity, i.Message, i.Domain})
	}
	return rowsToCsv(headers, rows)
}

func WriteAutoCsv(filename, content string) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return "", fmt.Errorf("resolve home dir: %w", err)
	}
	dir := filepath.Join(home, "Documents", "OpenSpider", "csv")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return "", err
	}
	return path, nil
}

func BuildPagesUrlList(pages []types.CrawledPage) string {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>`)
	b.WriteByte('\n')
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`)
	b.WriteByte('\n')
	for _, p := range pages {
		if p.URL == "" {
			continue
		}
		b.WriteString("  <url><loc>")
		b.WriteString(xmlEscape(p.URL))
		b.WriteString("</loc></url>\n")
	}
	b.WriteString("</urlset>\n")
	return b.String()
}

func xmlEscape(s string) string {
	r := strings.NewReplacer(
		`&`, `&amp;`,
		`<`, `&lt;`,
		`>`, `&gt;`,
		`"`, `&quot;`,
		`'`, `&apos;`,
	)
	return r.Replace(s)
}

func AutoExportSitemapXml(pages []types.CrawledPage, startURL string) (string, error) {
	xml := BuildPagesUrlList(pages)
	name := fmt.Sprintf("sitemap-%s-%d.xml", hostSlug(startURL), time.Now().UnixMilli())
	return WriteAutoCsv(name, xml)
}

func AutoExportPagesCsv(pages []types.CrawledPage, startURL string) (string, error) {
	csv := BuildPagesCsv(pages)
	name := fmt.Sprintf("pages-%s-%d.csv", hostSlug(startURL), time.Now().UnixMilli())
	return WriteAutoCsv(name, csv)
}

func AutoExportIssuesCsv(issues []types.SeoIssue, startURL string) (string, error) {
	csv := BuildIssuesCsv(issues)
	name := fmt.Sprintf("issues-%s-%d.csv", hostSlug(startURL), time.Now().UnixMilli())
	return WriteAutoCsv(name, csv)
}
