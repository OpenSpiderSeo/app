package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/openspider/openspider/internal/metrics"
	"github.com/openspider/openspider/internal/types"
)

const reportFormatVersion = 2

type ReportSummary struct {
	Pages       int    `json:"pages"`
	Errors      int    `json:"errors"`
	Warnings    int    `json:"warnings"`
	Infos       int    `json:"infos"`
	StartURL    string `json:"startUrl"`
	HealthScore int    `json:"healthScore,omitempty"`
}

type SeoReport struct {
	FormatVersion int               `json:"formatVersion"`
	ID            string            `json:"id"`
	Title         string            `json:"title"`
	CreatedAt     string            `json:"createdAt"`
	AppVersion    string            `json:"appVersion"`
	Options       types.CrawlOptions `json:"options"`
	Summary       ReportSummary     `json:"summary"`
	State         types.CrawlState  `json:"state"`
}

type HistoryListItem struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	CreatedAt   string  `json:"createdAt"`
	StartURL    string  `json:"startUrl"`
	Pages       int     `json:"pages"`
	Errors      int     `json:"errors"`
	Warnings    int     `json:"warnings"`
	HealthScore *int    `json:"healthScore"`
	HasAudit    bool    `json:"hasAudit"`
	FileName    string  `json:"fileName"`
}

type HistoryStore struct {
	mu      sync.Mutex
	projects *ProjectStore
}

func NewHistoryStore(projects *ProjectStore) *HistoryStore {
	return &HistoryStore{projects: projects}
}

func buildSummary(state types.CrawlState, startURL string) ReportSummary {
	local := metrics.BuildLocalMetrics(state)
	return ReportSummary{
		Pages:       local.Pages,
		Errors:      local.Errors,
		Warnings:    local.Warnings,
		Infos:       local.Infos,
		StartURL:    startURL,
		HealthScore: local.HealthScore,
	}
}

// historyHealthScore mirrors Overview /metrics/local (BuildLocalMetrics).
// Always derived from stored crawl state so legacy saves backfill on list.
func historyHealthScore(report SeoReport) *int {
	if len(report.State.Pages) == 0 && report.Summary.Pages == 0 {
		score := 0
		return &score
	}
	score := metrics.BuildLocalMetrics(report.State).HealthScore
	return &score
}

func (h *HistoryStore) BuildReport(state types.CrawlState, options types.CrawlOptions, title, appVersion string) SeoReport {
	startURL := options.StartURL
	if startURL == "" && state.Progress.StartURL != nil {
		startURL = *state.Progress.StartURL
	}
	now := types.NowISO()
	id := newID()
	if title == "" {
		title = "Check · " + startURL + " · " + now[:16]
	}
	return SeoReport{
		FormatVersion: reportFormatVersion,
		ID:            id,
		Title:         title,
		CreatedAt:     now,
		AppVersion:    appVersion,
		Options:       options,
		Summary:       buildSummary(state, startURL),
		State:         state,
	}
}

func (h *HistoryStore) SaveReport(report SeoReport) (HistoryListItem, error) {
	activeID, err := h.projects.ActiveID()
	if err != nil {
		return HistoryListItem{}, err
	}
	dir := historyDir(activeID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return HistoryListItem{}, err
	}
	name := report.ID + ".json"
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return HistoryListItem{}, err
	}
	if err := os.WriteFile(filepath.Join(dir, name), data, 0o644); err != nil {
		return HistoryListItem{}, err
	}
	return historyItemFromReport(report, name), nil
}

func historyItemFromReport(report SeoReport, fileName string) HistoryListItem {
	return HistoryListItem{
		ID:          report.ID,
		Title:       report.Title,
		CreatedAt:   report.CreatedAt,
		StartURL:    report.Summary.StartURL,
		Pages:       report.Summary.Pages,
		Errors:      report.Summary.Errors,
		Warnings:    report.Summary.Warnings,
		HealthScore: historyHealthScore(report),
		HasAudit:    false,
		FileName:    fileName,
	}
}

func (h *HistoryStore) List() ([]HistoryListItem, error) {
	activeID, err := h.projects.ActiveID()
	if err != nil {
		return nil, err
	}
	dir := historyDir(activeID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	var items []HistoryListItem
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(dir, e.Name()))
		if err != nil {
			continue
		}
		var report SeoReport
		if err := json.Unmarshal(raw, &report); err != nil {
			continue
		}
		if report.FormatVersion != reportFormatVersion {
			continue
		}
		items = append(items, historyItemFromReport(report, e.Name()))
	}
	sortHistory(items)
	return items, nil
}

func sortHistory(items []HistoryListItem) {
	for i := 0; i < len(items); i++ {
		for j := i + 1; j < len(items); j++ {
			if items[j].CreatedAt > items[i].CreatedAt {
				items[i], items[j] = items[j], items[i]
			}
		}
	}
}

func (h *HistoryStore) Load(id string) (*SeoReport, error) {
	activeID, err := h.projects.ActiveID()
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(filepath.Join(historyDir(activeID), id+".json"))
	if err != nil {
		return nil, nil
	}
	var report SeoReport
	if err := json.Unmarshal(raw, &report); err != nil {
		return nil, nil
	}
	if report.FormatVersion != reportFormatVersion {
		return nil, nil
	}
	return &report, nil
}

func (h *HistoryStore) Delete(id string) (bool, error) {
	activeID, err := h.projects.ActiveID()
	if err != nil {
		return false, err
	}
	path := filepath.Join(historyDir(activeID), id+".json")
	if err := os.Remove(path); err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
