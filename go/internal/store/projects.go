package store

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

)

const defaultCrawlConfig = `{"maxConcurrency":4,"requestTimeoutMs":15000,"maxDepth":10,"sameOriginOnly":true,"followLinks":true}`

type Project struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	StartURL  string   `json:"startUrl"`
	Domain    string   `json:"domain"`
	Keyword   *string  `json:"keyword,omitempty"`
	Keywords  []string `json:"keywords,omitempty"`
	Notes     *string  `json:"notes,omitempty"`
	CreatedAt string   `json:"createdAt"`
	UpdatedAt string   `json:"updatedAt"`
}

type ProjectIndex struct {
	ActiveID *string   `json:"activeId"`
	Projects []Project `json:"projects"`
}

type CreateProjectInput struct {
	Name     string   `json:"name"`
	StartURL string   `json:"startUrl"`
	Keyword  *string  `json:"keyword,omitempty"`
	Keywords []string `json:"keywords,omitempty"`
}

type UpdateProjectInput struct {
	Name     *string  `json:"name,omitempty"`
	StartURL *string  `json:"startUrl,omitempty"`
	Keyword  *string  `json:"keyword,omitempty"`
	Keywords []string `json:"keywords,omitempty"`
	Notes    *string  `json:"notes,omitempty"`
}

type MemoryNote struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	CreatedAt string `json:"createdAt"`
}

type memoryFile struct {
	Notes []MemoryNote `json:"notes"`
}

type ProjectStore struct {
	mu      sync.RWMutex
	activeID *string
	index   ProjectIndex
	loaded  bool
}

func NewProjectStore() *ProjectStore {
	return &ProjectStore{}
}

func (s *ProjectStore) load() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.loaded {
		return nil
	}
	if err := os.MkdirAll(projectsRoot(), 0o755); err != nil {
		return err
	}
	raw, err := os.ReadFile(indexPath())
	if err != nil {
		if os.IsNotExist(err) {
			s.index = ProjectIndex{ActiveID: nil, Projects: []Project{}}
			s.loaded = true
			return nil
		}
		return err
	}
	var idx ProjectIndex
	if err := json.Unmarshal(raw, &idx); err != nil {
		return err
	}
	if idx.Projects == nil {
		idx.Projects = []Project{}
	}
	s.index = idx
	s.activeID = idx.ActiveID
	s.loaded = true
	return nil
}

func (s *ProjectStore) saveIndexLocked() error {
	if err := os.MkdirAll(projectsRoot(), 0o755); err != nil {
		return err
	}
	s.index.ActiveID = s.activeID
	data, err := json.MarshalIndent(s.index, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(indexPath(), data, 0o644)
}

func domainFromURL(startURL string) string {
	startURL = strings.TrimSpace(startURL)
	if i := strings.Index(startURL, "://"); i >= 0 {
		rest := startURL[i+3:]
		if j := strings.Index(rest, "/"); j >= 0 {
			return rest[:j]
		}
		return rest
	}
	return startURL
}

func mergeKeywords(keywords []string, keyword *string) []string {
	out := append([]string(nil), keywords...)
	if keyword != nil && strings.TrimSpace(*keyword) != "" {
		kw := strings.TrimSpace(*keyword)
		found := false
		for _, k := range out {
			if k == kw {
				found = true
				break
			}
		}
		if !found {
			out = append(out, kw)
		}
	}
	return out
}

func (s *ProjectStore) seedProjectFiles(p Project) error {
	dir := projectDir(p.ID)
	if err := os.MkdirAll(filepath.Join(dir, "history"), 0o755); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "meta.json"), mustJSON(p), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "crawl-config.json"), []byte(defaultCrawlConfig), 0o644); err != nil {
		return err
	}
	if err := os.WriteFile(filepath.Join(dir, "ranks.json"), []byte("[]"), 0o644); err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "memory.json"), []byte(`{"notes":[]}`), 0o644)
}

func (s *ProjectStore) ListProjects() ([]Project, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := append([]Project(nil), s.index.Projects...)
	sortProjectsByUpdated(out)
	return out, nil
}

func sortProjectsByUpdated(projects []Project) {
	for i := 0; i < len(projects); i++ {
		for j := i + 1; j < len(projects); j++ {
			if projects[j].UpdatedAt > projects[i].UpdatedAt {
				projects[i], projects[j] = projects[j], projects[i]
			}
		}
	}
}

func (s *ProjectStore) GetActiveProject() (*Project, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.activeID == nil {
		return nil, nil
	}
	for _, p := range s.index.Projects {
		if p.ID == *s.activeID {
			cp := p
			return &cp, nil
		}
	}
	return nil, nil
}

func (s *ProjectStore) ActiveID() (*string, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.activeID, nil
}

func (s *ProjectStore) SetActiveProject(id *string) (*Project, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if id != nil {
		found := false
		for _, p := range s.index.Projects {
			if p.ID == *id {
				found = true
				break
			}
		}
		if !found {
			return nil, errors.New("project not found")
		}
	}
	s.activeID = id
	if err := s.saveIndexLocked(); err != nil {
		return nil, err
	}
	if id == nil {
		return nil, nil
	}
	for _, p := range s.index.Projects {
		if p.ID == *id {
			cp := p
			return &cp, nil
		}
	}
	return nil, nil
}

func (s *ProjectStore) CreateProject(input CreateProjectInput) (Project, error) {
	if err := s.load(); err != nil {
		return Project{}, err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	keywords := mergeKeywords(input.Keywords, input.Keyword)
	var kwPtr *string
	if len(keywords) > 0 {
		kwPtr = &keywords[0]
	}
	p := Project{
		ID:        newID(),
		Name:      strings.TrimSpace(input.Name),
		StartURL:  strings.TrimSpace(input.StartURL),
		Domain:    domainFromURL(input.StartURL),
		Keywords:  keywords,
		Keyword:   kwPtr,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if err := s.seedProjectFiles(p); err != nil {
		return Project{}, err
	}
	s.mu.Lock()
	s.index.Projects = append([]Project{p}, s.index.Projects...)
	s.activeID = &p.ID
	if err := s.saveIndexLocked(); err != nil {
		s.mu.Unlock()
		return Project{}, err
	}
	s.mu.Unlock()
	return p, nil
}

func (s *ProjectStore) UpdateProject(id string, patch UpdateProjectInput) (*Project, error) {
	if err := s.load(); err != nil {
		return nil, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i, p := range s.index.Projects {
		if p.ID == id {
			idx = i
			break
		}
	}
	if idx < 0 {
		return nil, nil
	}
	cur := s.index.Projects[idx]
	if patch.Name != nil {
		cur.Name = strings.TrimSpace(*patch.Name)
	}
	if patch.StartURL != nil {
		cur.StartURL = strings.TrimSpace(*patch.StartURL)
		cur.Domain = domainFromURL(cur.StartURL)
	}
	if patch.Notes != nil {
		cur.Notes = patch.Notes
	}
	if patch.Keywords != nil || patch.Keyword != nil {
		kws := cur.Keywords
		if patch.Keywords != nil {
			kws = patch.Keywords
		}
		cur.Keywords = mergeKeywords(kws, patch.Keyword)
		if len(cur.Keywords) > 0 {
			cur.Keyword = &cur.Keywords[0]
		}
	}
	cur.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.index.Projects[idx] = cur
	if err := s.saveIndexLocked(); err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(projectDir(id), "meta.json"), mustJSON(cur), 0o644); err != nil {
		return nil, err
	}
	cp := cur
	return &cp, nil
}

func (s *ProjectStore) DeleteProject(id string) (bool, error) {
	if err := s.load(); err != nil {
		return false, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	before := len(s.index.Projects)
	filtered := make([]Project, 0, len(s.index.Projects))
	for _, p := range s.index.Projects {
		if p.ID != id {
			filtered = append(filtered, p)
		}
	}
	if len(filtered) == before {
		return false, nil
	}
	s.index.Projects = filtered
	if s.activeID != nil && *s.activeID == id {
		if len(filtered) > 0 {
			s.activeID = &filtered[0].ID
		} else {
			s.activeID = nil
		}
	}
	if err := s.saveIndexLocked(); err != nil {
		return false, err
	}
	_ = os.RemoveAll(projectDir(id))
	return true, nil
}

func (s *ProjectStore) ListMemory(projectID *string) ([]MemoryNote, error) {
	id, err := s.resolveProjectID(projectID)
	if err != nil || id == "" {
		return []MemoryNote{}, err
	}
	raw, err := os.ReadFile(filepath.Join(projectDir(id), "memory.json"))
	if err != nil {
		return []MemoryNote{}, nil
	}
	var mf memoryFile
	if err := json.Unmarshal(raw, &mf); err != nil {
		return []MemoryNote{}, nil
	}
	if mf.Notes == nil {
		return []MemoryNote{}, nil
	}
	return mf.Notes, nil
}

func (s *ProjectStore) AddMemory(text string, projectID *string) (*MemoryNote, error) {
	id, err := s.resolveProjectID(projectID)
	if err != nil || id == "" {
		return nil, nil
	}
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, nil
	}
	notes, _ := s.ListMemory(&id)
	note := MemoryNote{
		ID:        newID(),
		Text:      text,
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	}
	notes = append([]MemoryNote{note}, notes...)
	mf := memoryFile{Notes: notes}
	dir := projectDir(id)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	if err := os.WriteFile(filepath.Join(dir, "memory.json"), mustJSON(mf), 0o644); err != nil {
		return nil, err
	}
	return &note, nil
}

func (s *ProjectStore) resolveProjectID(projectID *string) (string, error) {
	if projectID != nil && *projectID != "" {
		return *projectID, nil
	}
	if err := s.load(); err != nil {
		return "", err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.activeID == nil {
		return "", nil
	}
	return *s.activeID, nil
}

func mustJSON(v interface{}) []byte {
	b, _ := json.MarshalIndent(v, "", "  ")
	return b
}
