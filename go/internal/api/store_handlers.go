package api

import (
	"encoding/json"
	"net/http"

	"github.com/openspider/openspider/internal/export"
	"github.com/openspider/openspider/internal/store"
)

func (s *Server) handleCrawlPause(w http.ResponseWriter, _ *http.Request) {
	if err := s.engine.Pause(); err != nil {
		writeAPIErr(w, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) handleCrawlResume(w http.ResponseWriter, _ *http.Request) {
	if err := s.engine.Resume(); err != nil {
		writeAPIErr(w, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

func (s *Server) handleListHistory(w http.ResponseWriter, _ *http.Request) {
	items, err := s.history.List()
	if err != nil {
		writeAPIErr(w, err)
		return
	}
	if items == nil {
		items = []store.HistoryListItem{}
	}
	writeJSON(w, items)
}

func (s *Server) handleLoadHistory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, nil)
		return
	}
	report, err := s.history.Load(input.ID)
	if err != nil {
		writeJSON(w, nil)
		return
	}
	writeJSON(w, report)
}

func (s *Server) handleDeleteHistory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, map[string]bool{"ok": false})
		return
	}
	ok, _ := s.history.Delete(input.ID)
	writeJSON(w, map[string]bool{"ok": ok})
}

func (s *Server) handleSaveHistory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Title *string `json:"title"`
	}
	_ = json.NewDecoder(r.Body).Decode(&input)
	state := s.engine.GetState()
	opts := s.engine.GetConfig()
	opts.StartURL = strVal(state.Progress.StartURL)
	title := ""
	if input.Title != nil {
		title = *input.Title
	}
	report := s.history.BuildReport(state, opts, title, Version)
	item, err := s.history.SaveReport(report)
	if err != nil {
		writeJSON(w, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, item)
}

func (s *Server) handleCurrentReport(w http.ResponseWriter, _ *http.Request) {
	state := s.engine.GetState()
	opts := s.engine.GetConfig()
	opts.StartURL = strVal(state.Progress.StartURL)
	report := s.history.BuildReport(state, opts, "", Version)
	writeJSON(w, report)
}

func (s *Server) handleExportCsvPages(w http.ResponseWriter, _ *http.Request) {
	state := s.engine.GetState()
	startURL := strVal(state.Progress.StartURL)
	path, err := export.AutoExportPagesCsv(state.Pages, startURL)
	if err != nil {
		writeJSON(w, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, map[string]string{"path": path})
}

func (s *Server) handleExportCsvIssues(w http.ResponseWriter, _ *http.Request) {
	state := s.engine.GetState()
	startURL := strVal(state.Progress.StartURL)
	path, err := export.AutoExportIssuesCsv(state.Issues, startURL)
	if err != nil {
		writeJSON(w, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, map[string]string{"path": path})
}

func strVal(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func (s *Server) handleListProjects(w http.ResponseWriter, _ *http.Request) {
	items, err := s.projects.ListProjects()
	if err != nil {
		writeJSON(w, []store.Project{})
		return
	}
	if items == nil {
		items = []store.Project{}
	}
	writeJSON(w, items)
}

func (s *Server) handleGetActiveProject(w http.ResponseWriter, _ *http.Request) {
	p, _ := s.projects.GetActiveProject()
	writeJSON(w, p)
}

func (s *Server) handleSetActiveProject(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID *string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, nil)
		return
	}
	p, err := s.projects.SetActiveProject(input.ID)
	if err != nil {
		writeJSONStatus(w, http.StatusNotFound, map[string]interface{}{"ok": false, "message": err.Error()})
		return
	}
	writeJSON(w, p)
}

func (s *Server) handleCreateProject(w http.ResponseWriter, r *http.Request) {
	var input store.CreateProjectInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, nil)
		return
	}
	p, err := s.projects.CreateProject(input)
	if err != nil {
		writeJSON(w, map[string]interface{}{"error": err.Error()})
		return
	}
	writeJSON(w, p)
}

func (s *Server) handleUpdateProject(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID    string                 `json:"id"`
		Patch store.UpdateProjectInput `json:"patch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, nil)
		return
	}
	p, _ := s.projects.UpdateProject(input.ID, input.Patch)
	writeJSON(w, p)
}

func (s *Server) handleDeleteProject(w http.ResponseWriter, r *http.Request) {
	var input struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, map[string]bool{"ok": false})
		return
	}
	ok, _ := s.projects.DeleteProject(input.ID)
	writeJSON(w, map[string]bool{"ok": ok})
}

func (s *Server) handleListProjectMemory(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("projectId")
	var pid *string
	if projectID != "" {
		pid = &projectID
	}
	notes, _ := s.projects.ListMemory(pid)
	if notes == nil {
		notes = []store.MemoryNote{}
	}
	writeJSON(w, notes)
}

func (s *Server) handleAddProjectMemory(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Text      string  `json:"text"`
		ProjectID *string `json:"projectId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeJSON(w, nil)
		return
	}
	note, _ := s.projects.AddMemory(input.Text, input.ProjectID)
	writeJSON(w, note)
}
