package crawl

import (
	"context"
	"sync"
	"time"

	"github.com/openspider/openspider/internal/issues"
	"github.com/openspider/openspider/internal/types"
	"github.com/openspider/openspider/internal/urlutil"
)

const (
	defaultConcurrency = 4
	defaultTimeoutMs   = 15000
	defaultMaxDepth    = 10
	// MaxAllowedDepth is the highest crawl depth accepted by the engine (matches UI cap).
	MaxAllowedDepth = 50
	DefaultUserAgent   = "OpenSpider/0.11 (+https://github.com/OpenSpiderSeo/app)"
)

type queueItem struct {
	url   string
	depth int
}

type EventBroadcaster func(eventType string, data interface{})

type Engine struct {
	mu          sync.RWMutex
	status      string
	options     types.CrawlOptions
	pages       []types.CrawledPage
	pagesByURL  map[string]types.CrawledPage
	issues      []types.SeoIssue
	issueIDs    map[string]struct{}
	seen        map[string]struct{}
	inlinks     map[string]int
	frontier    []queueItem
	storedHTML  map[string]string
	robotsGate  *RobotsGate
	startedAt   *string
	finishedAt  *string
	errorCount  int
	stopCh      chan struct{}
	cancel      context.CancelFunc
	broadcast   EventBroadcaster
	savedConfig types.CrawlOptions
	pauseCond   sync.Cond
	activeJobs  int
}

func NewEngine(broadcast EventBroadcaster) *Engine {
	e := &Engine{
		status:     types.CrawlIdle,
		pagesByURL: map[string]types.CrawledPage{},
		issueIDs:   map[string]struct{}{},
		seen:       map[string]struct{}{},
		inlinks:    map[string]int{},
		storedHTML: map[string]string{},
		broadcast:  broadcast,
		savedConfig: types.CrawlOptions{
			MaxConcurrency:   defaultConcurrency,
			RequestTimeoutMs: defaultTimeoutMs,
			MaxDepth:         defaultMaxDepth,
			UserAgent:        DefaultUserAgent,
			SameOriginOnly:   true,
			FollowLinks:      true,
		},
	}
	e.pauseCond.L = &e.mu
	return e
}

func (e *Engine) GetConfig() types.CrawlOptions {
	e.mu.RLock()
	defer e.mu.RUnlock()
	cfg := e.savedConfig
	return cfg
}

func (e *Engine) SaveConfig(cfg types.CrawlOptions) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if cfg.MaxConcurrency > 0 {
		e.savedConfig.MaxConcurrency = cfg.MaxConcurrency
	}
	if cfg.RequestTimeoutMs > 0 {
		e.savedConfig.RequestTimeoutMs = cfg.RequestTimeoutMs
	}
	if cfg.UserAgent != "" {
		e.savedConfig.UserAgent = cfg.UserAgent
	}
	if cfg.MaxDepth > 0 {
		e.savedConfig.MaxDepth = cfg.MaxDepth
	}
	e.savedConfig.SameOriginOnly = cfg.SameOriginOnly
	e.savedConfig.FollowLinks = cfg.FollowLinks
	if cfg.MaxURLs > 0 {
		e.savedConfig.MaxURLs = cfg.MaxURLs
	}
	e.savedConfig.RespectRobotsTxt = cfg.RespectRobotsTxt
	e.savedConfig.SeedFromSitemap = cfg.SeedFromSitemap
	e.savedConfig.StoreHTML = cfg.StoreHTML
}

func copyCrawlPages(pages []types.CrawledPage) []types.CrawledPage {
	out := make([]types.CrawledPage, 0, len(pages))
	for _, p := range pages {
		out = append(out, NormalizePage(p))
	}
	return out
}

func copyCrawlIssues(issues []types.SeoIssue) []types.SeoIssue {
	out := append([]types.SeoIssue{}, issues...)
	if out == nil {
		return []types.SeoIssue{}
	}
	return out
}

func (e *Engine) GetState() types.CrawlState {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return types.CrawlState{
		Progress: e.progressLocked(),
		Pages:    copyCrawlPages(e.pages),
		Issues:   copyCrawlIssues(e.issues),
	}
}

func (e *Engine) progressLocked() types.CrawlProgress {
	issueErrors := 0
	issueWarnings := 0
	for _, issue := range e.issues {
		switch issue.Severity {
		case types.SeverityError:
			issueErrors++
		case types.SeverityWarning:
			issueWarnings++
		}
	}
	return types.CrawlProgress{
		Status:        e.status,
		Queued:        len(e.frontier),
		Active:        e.activeJobs,
		Fetched:       len(e.pages),
		Errors:        e.errorCount,
		MaxURLs:       e.options.MaxURLs,
		MaxDepth:      e.options.MaxDepth,
		IssueCount:    len(e.issues),
		IssueErrors:   issueErrors,
		IssueWarnings: issueWarnings,
		StartedAt:     e.startedAt,
		FinishedAt:    e.finishedAt,
		StartURL:      strOrNil(e.options.StartURL),
	}
}

func strOrNil(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func (e *Engine) emitProgress() {
	if e.broadcast == nil {
		return
	}
	e.mu.RLock()
	p := e.progressLocked()
	e.mu.RUnlock()
	e.broadcast("progress", p)
}

func (e *Engine) emitPage(page types.CrawledPage) {
	if e.broadcast != nil {
		e.broadcast("page", page)
	}
}

func (e *Engine) emitFinished() {
	if e.broadcast != nil {
		e.mu.RLock()
		state := types.CrawlState{
			Progress: e.progressLocked(),
			Pages:    copyCrawlPages(e.pages),
			Issues:   copyCrawlIssues(e.issues),
		}
		e.mu.RUnlock()
		e.broadcast("finished", state)
	}
}

func (e *Engine) emitError(message string) {
	if e.broadcast != nil {
		e.broadcast("error", map[string]string{"message": message})
	}
}

func (e *Engine) Start(opts types.CrawlOptions) error {
	e.mu.Lock()
	if e.status == types.CrawlRunning || e.status == types.CrawlStopping {
		e.mu.Unlock()
		return errBusy("crawl already running")
	}

	e.resetLocked(opts)
	e.status = types.CrawlRunning
	now := types.NowISO()
	e.startedAt = &now
	startURL := urlutil.NormalizeURL(opts.StartURL, "")
	if startURL == "" {
		e.status = types.CrawlIdle
		e.mu.Unlock()
		return errBusy("invalid start URL")
	}
	opts.StartURL = startURL
	e.options = opts
	e.frontier = []queueItem{{url: startURL, depth: 0}}
	e.seen[startURL] = struct{}{}

	concurrency := opts.MaxConcurrency
	if concurrency <= 0 {
		concurrency = e.savedConfig.MaxConcurrency
	}
	if concurrency <= 0 {
		concurrency = defaultConcurrency
	}
	timeoutMs := opts.RequestTimeoutMs
	if timeoutMs <= 0 {
		timeoutMs = e.savedConfig.RequestTimeoutMs
	}
	if timeoutMs <= 0 {
		timeoutMs = defaultTimeoutMs
	}
	userAgent := opts.UserAgent
	if userAgent == "" {
		userAgent = e.savedConfig.UserAgent
	}
	if userAgent == "" {
		userAgent = DefaultUserAgent
	}
	maxDepth := opts.MaxDepth
	if maxDepth <= 0 {
		maxDepth = e.savedConfig.MaxDepth
	}
	if maxDepth <= 0 {
		maxDepth = defaultMaxDepth
	}
	sameOrigin := opts.SameOriginOnly
	followLinks := opts.FollowLinks
	if !followLinks && !opts.ListMode {
		followLinks = true
	}
	if opts.ListMode {
		followLinks = false
	}
	maxURLs := opts.MaxURLs
	opts.MaxDepth = maxDepth
	e.options = opts
	origin := urlutil.OriginOf(startURL)

	respectRobots := opts.RespectRobotsTxt
	if !respectRobots {
		respectRobots = e.savedConfig.RespectRobotsTxt
	}
	storeHTML := opts.StoreHTML

	e.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	e.mu.Lock()
	e.cancel = cancel
	e.stopCh = make(chan struct{})
	e.mu.Unlock()

	client := NewHTTPClient(timeoutMs)
	var robotsGate *RobotsGate
	if respectRobots {
		ClearRobotsCache()
		robotsGate = FetchRobotsGate(ctx, client, origin, userAgent)
		e.mu.Lock()
		e.robotsGate = robotsGate
		e.mu.Unlock()
	}
	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup

	process := func(item queueItem) {
		defer func() {
			e.mu.Lock()
			e.activeJobs--
			e.pauseCond.Broadcast()
			e.mu.Unlock()
			wg.Done()
		}()
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
		case <-ctx.Done():
			return
		}

		if e.isStopped() {
			return
		}

		e.mu.RLock()
		gate := e.robotsGate
		e.mu.RUnlock()
		if gate != nil && !gate.IsAllowed(item.url) {
			return
		}

		result := FetchPage(ctx, client, item.url, userAgent)
		var page types.CrawledPage
		if result.Error != nil && result.StatusCode == 0 {
			msg := *result.Error
			page = BuildPage(item.url, 0, result.ContentType, result.RedirectURL, item.depth, e.getInlinks(item.url), Extracted{}, &msg)
			e.addPage(page, nil, "")
			e.mu.Lock()
			e.errorCount++
			e.mu.Unlock()
			return
		}

		var extracted Extracted
		body := ""
		// Only parse HTML for successful document responses — not 3xx (seed must stay the requested URL).
		okDoc := result.StatusCode >= 200 && result.StatusCode < 300
		if okDoc && IsHTML(result.ContentType) && result.Body != "" {
			body = result.Body
			extracted = ExtractHTML(result.Body, item.url)
		}
		page = BuildPage(item.url, result.StatusCode, result.ContentType, result.RedirectURL, item.depth, e.getInlinks(item.url), extracted, result.Error)

		var outlinks []string
		if followLinks && okDoc && IsHTML(result.ContentType) {
			outlinks = extracted.Links
		}
		htmlStored := ""
		if storeHTML && body != "" {
			htmlStored = body
		}
		e.addPage(page, outlinks, htmlStored)

		if followLinks && item.depth < maxDepth {
			// Follow redirect Location as the next crawl hop without rewriting StartURL / seed.
			if result.RedirectURL != nil && result.StatusCode >= 300 && result.StatusCode < 400 {
				key := urlutil.NormalizeURL(*result.RedirectURL, "")
				if key != "" && !(sameOrigin && !urlutil.SameOrigin(key, origin)) {
					e.enqueue(key, item.depth+1, origin, maxURLs, gate)
				}
			}
			for _, link := range outlinks {
				key := urlutil.NormalizeURL(link, "")
				if key == "" {
					continue
				}
				if sameOrigin && !urlutil.SameOrigin(key, origin) {
					continue
				}
				e.enqueue(key, item.depth+1, origin, maxURLs, gate)
			}
		}
	}

	go func() {
		e.emitProgress()
		for {
			if e.isStopped() {
				break
			}
			e.mu.Lock()
			for e.status == types.CrawlPaused {
				e.pauseCond.Wait()
				if e.isStoppedLocked() {
					e.mu.Unlock()
					goto finish
				}
			}
			if e.status == types.CrawlPausing {
				if e.activeJobs == 0 {
					e.status = types.CrawlPaused
					e.emitProgressLocked()
				} else {
					e.pauseCond.Wait()
					e.mu.Unlock()
					continue
				}
			}
			if len(e.frontier) == 0 {
				if e.activeJobs == 0 {
					e.mu.Unlock()
					break
				}
				e.mu.Unlock()
				time.Sleep(25 * time.Millisecond)
				continue
			}
			item := e.frontier[0]
			e.frontier = e.frontier[1:]
			e.activeJobs++
			e.mu.Unlock()

			wg.Add(1)
			go process(item)
			e.emitProgress()
		}
		wg.Wait()

	finish:
		e.mu.Lock()
		if e.status == types.CrawlStopping {
			e.status = types.CrawlIdle
		} else if e.status == types.CrawlRunning {
			e.status = types.CrawlFinished
			now := types.NowISO()
			e.finishedAt = &now
			e.recomputeSitewideLocked()
		} else if e.status == types.CrawlPaused {
			// keep paused state for resume
		}
		e.mu.Unlock()
		e.emitProgress()
		if e.status == types.CrawlFinished {
			e.emitFinished()
		}
	}()

	return nil
}

func (e *Engine) isStoppedLocked() bool {
	select {
	case <-e.stopCh:
		return true
	default:
		return false
	}
}

func (e *Engine) isStopped() bool {
	select {
	case <-e.stopCh:
		return true
	default:
		return false
	}
}

func (e *Engine) Pause() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.status != types.CrawlRunning {
		return errBusy("crawl not running")
	}
	e.status = types.CrawlPausing
	e.emitProgressLocked()
	for e.activeJobs > 0 && e.status == types.CrawlPausing {
		e.pauseCond.Wait()
	}
	if e.status == types.CrawlStopping {
		return errBusy("crawl stopping")
	}
	e.status = types.CrawlPaused
	e.emitProgressLocked()
	return nil
}

func (e *Engine) Resume() error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.status != types.CrawlPaused {
		return errBusy("nothing to resume")
	}
	e.status = types.CrawlRunning
	e.pauseCond.Broadcast()
	e.emitProgressLocked()
	return nil
}

func (e *Engine) GetStoredHTML() map[string]string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	out := make(map[string]string, len(e.storedHTML))
	for k, v := range e.storedHTML {
		out[k] = v
	}
	return out
}

func (e *Engine) AddIssues(newIssues []types.SeoIssue) int {
	e.mu.Lock()
	defer e.mu.Unlock()
	added := 0
	for _, issue := range newIssues {
		if _, dup := e.issueIDs[issue.ID]; dup {
			continue
		}
		e.issueIDs[issue.ID] = struct{}{}
		e.issues = append(e.issues, issue)
		added++
	}
	return added
}

func (e *Engine) ClearIssuesByCode(code string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	filtered := e.issues[:0]
	for _, issue := range e.issues {
		if issue.Code == code {
			delete(e.issueIDs, issue.ID)
			continue
		}
		filtered = append(filtered, issue)
	}
	e.issues = filtered
}

func (e *Engine) emitProgressLocked() {
	if e.broadcast == nil {
		return
	}
	p := e.progressLocked()
	e.mu.Unlock()
	e.broadcast("progress", p)
	e.mu.Lock()
}

func (e *Engine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.status != types.CrawlRunning && e.status != types.CrawlPaused && e.status != types.CrawlPausing {
		return
	}
	e.status = types.CrawlStopping
	if e.stopCh != nil {
		close(e.stopCh)
	}
	if e.cancel != nil {
		e.cancel()
	}
	e.pauseCond.Broadcast()
}

func (e *Engine) resetLocked(opts types.CrawlOptions) {
	e.pages = nil
	e.pagesByURL = map[string]types.CrawledPage{}
	e.issues = nil
	e.issueIDs = map[string]struct{}{}
	e.seen = map[string]struct{}{}
	e.inlinks = map[string]int{}
	e.frontier = nil
	e.startedAt = nil
	e.finishedAt = nil
	e.errorCount = 0
	e.storedHTML = map[string]string{}
	e.robotsGate = nil
	e.activeJobs = 0
	_ = opts
}

func (e *Engine) getInlinks(url string) int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.inlinks[url]
}

func (e *Engine) enqueue(url string, depth int, origin string, maxURLs int, gate *RobotsGate) {
	e.mu.Lock()
	defer e.mu.Unlock()
	if gate != nil && !gate.IsAllowed(url) {
		return
	}
	if maxURLs > 0 && len(e.pages)+len(e.frontier) >= maxURLs {
		return
	}
	if _, ok := e.seen[url]; ok {
		e.inlinks[url]++
		return
	}
	e.seen[url] = struct{}{}
	e.inlinks[url] = 1
	e.frontier = append(e.frontier, queueItem{url: url, depth: depth})
}

func (e *Engine) addPage(page types.CrawledPage, outlinks []string, html string) {
	e.mu.Lock()
	if existing, ok := e.pagesByURL[page.URL]; ok {
		page.Inlinks = existing.Inlinks
	}
	e.pagesByURL[page.URL] = page
	e.pages = append(e.pages, page)
	if html != "" {
		e.storedHTML[page.URL] = html
	}

	for _, issue := range issues.DetectPageIssues(page) {
		if _, dup := e.issueIDs[issue.ID]; dup {
			continue
		}
		e.issueIDs[issue.ID] = struct{}{}
		e.issues = append(e.issues, issue)
	}
	for _, link := range outlinks {
		key := urlutil.NormalizeURL(link, "")
		if key != "" {
			e.inlinks[key]++
		}
	}
	e.mu.Unlock()
	e.emitPage(page)
}

func (e *Engine) recomputeSitewideLocked() {
	sitewide := issues.DetectSitewideIssues(e.pages)
	for _, issue := range sitewide {
		if _, dup := e.issueIDs[issue.ID]; dup {
			continue
		}
		e.issueIDs[issue.ID] = struct{}{}
		e.issues = append(e.issues, issue)
	}
}

type busyError string

func (e busyError) Error() string { return string(e) }

func errBusy(msg string) error { return busyError(msg) }

// WaitUntilDone blocks until crawl reaches a terminal or paused state or timeout elapses.
func (e *Engine) WaitUntilDone(timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		e.mu.RLock()
		status := e.status
		e.mu.RUnlock()
		switch status {
		case types.CrawlFinished, types.CrawlError, types.CrawlIdle, types.CrawlPaused:
			return
		}
		time.Sleep(500 * time.Millisecond)
	}
}

// Throttled progress ticker for long crawls.
func (e *Engine) StartProgressTicker(interval time.Duration) func() {
	ticker := time.NewTicker(interval)
	done := make(chan struct{})
	go func() {
		for {
			select {
			case <-ticker.C:
				e.emitProgress()
			case <-done:
				ticker.Stop()
				return
			}
		}
	}()
	return func() { close(done) }
}
