/** OpenSpider API client — Neutralino Go extension RPC or HTTP sidecar fallback. */
import type { OpenSpiderApi, CrawlStartResult, AppUpdateStatus, FetchAsBotRequest, FetchAsBotResponse } from '@shared/types/ipc.types';
import type { CrawlOptions, CrawlProgress, CrawlState, CrawledPage } from '@shared/types/crawl.types';
import { normalizeCrawlState, normalizeCrawledPage } from '@shared/utils/crawl-state.utils';
import type { HistoryListItem, SeoReport } from '@shared/types/report.types';
import type { ProjectMemoryNote, SeoProject } from '@shared/types/project.types';
import type { FullAuditResult, LighthouseScores, LocalMetricsSnapshot, SerpReport } from '@shared/types/audit.types';
import type { LlmsTxtProbe } from '@shared/types/llms.types';
import type { CreateProjectInput, UpdateProjectInput } from '@shared/types/ipc.types';
import { connectCrawlEvents } from './sse';
import { apiGet, apiPost, initExtensionTransport } from './transport';

const updateStatus: AppUpdateStatus = { phase: 'idle' };
const updateHandlers = new Set<(s: AppUpdateStatus) => void>();

export function createOpenSpiderApi(): OpenSpiderApi {
  return {
    getAppInfo: () => apiGet('/api/app/info'),

    checkForUpdates: async () => updateStatus,
    installUpdate: async () => ({ ok: false, error: 'Auto-update not available in Neutralino build' }),
    getUpdateStatus: async () => updateStatus,
    onUpdateStatus: (handler) => {
      updateHandlers.add(handler);
      return () => updateHandlers.delete(handler);
    },

    startCrawl: (options: CrawlOptions) => apiPost('/api/crawl/start', options),
    stopCrawl: () => apiPost('/api/crawl/stop'),
    pauseCrawl: () => apiPost<{ ok: true } | { ok: false; error: string }>('/api/crawl/pause'),
    resumeCrawl: () => apiPost<CrawlStartResult>('/api/crawl/resume'),
    getCrawlState: () => apiGet<CrawlState>('/api/crawl/state').then(normalizeCrawlState),
    getCrawlConfig: () => apiGet<Omit<CrawlOptions, 'startUrl'>>('/api/crawl/config'),
    saveCrawlConfig: (config) => apiPost('/api/crawl/config', config),

    searchHtml: async () => ({ error: 'HTML search not yet ported to Go' }),
    extractCss: async () => ({ error: 'CSS extract not yet ported to Go' }),
    getLinkGraph: () => apiGet('/api/crawl/link-graph'),

    saveSession: async () => ({ error: 'Session save not yet ported to Go' }),
    loadSession: async () => ({ ok: false, error: 'Session load not yet ported to Go' }),

    listIntegrations: () => apiGet('/api/integrations'),
    getSecrets: () => apiGet('/api/secrets'),
    saveSecrets: (patch) => apiPost('/api/secrets', patch),
    listOssCredits: () => apiGet('/api/oss/credits'),

    exportSitemap: async () => ({ error: 'Sitemap export not yet ported to Go' }),
    probeLlmsTxt: (origin) =>
      apiPost<LlmsTxtProbe>('/api/labs/llms', { origin }),
    runPagespeed: (url, preferLocal) =>
      apiPost<LighthouseScores>('/api/labs/pagespeed', { url, preferLocal: Boolean(preferLocal) }),
    runSerp: (domainOrUrl, keyword) =>
      apiPost<SerpReport>('/api/labs/serp', { url: domainOrUrl, keyword }),
    runFullAudit: (payload) =>
      apiPost<FullAuditResult>('/api/labs/full-audit', payload, 180_000),
    getLocalMetrics: () => apiGet<LocalMetricsSnapshot>('/api/metrics/local'),

    listHistory: () => apiGet<HistoryListItem[]>('/api/history'),
    loadHistory: (id) =>
      apiPost<SeoReport | null>('/api/history/load', { id }).then((report) =>
        report ? { ...report, state: normalizeCrawlState(report.state) } : null,
      ),
    deleteHistory: (id) =>
      apiPost<{ ok: boolean }>('/api/history/delete', { id }).then((r) => r.ok),
    saveCurrentToHistory: (title) =>
      apiPost<HistoryListItem | { error: string }>('/api/history/save', title ? { title } : {}),
    getCurrentReport: () =>
      apiGet<SeoReport>('/api/report/current').then((report) => ({
        ...report,
        state: normalizeCrawlState(report.state),
      })),
    exportReport: async () => ({ error: 'Report export not yet ported to Go' }),
    exportReportPdf: async () => ({ error: 'PDF export not yet ported to Go' }),
    autoExportReport: async () => ({ ok: false, error: 'Auto export not yet ported to Go' }),
    autoExportSitemap: async () => ({ error: 'Sitemap auto export not yet ported to Go' }),
    importReport: async () => ({ ok: false, error: 'Import not yet ported to Go' }),
    exportCsvPages: () => apiPost<{ path: string } | { error: string }>('/api/report/export-csv-pages'),
    exportCsvIssues: () =>
      apiPost<{ path: string } | { error: string }>('/api/report/export-csv-issues'),

    runCustomJs: async () => ({ error: 'Custom JS not available (no Chromium in Go engine)' }),
    runAiScan: async () => ({ tips: [], pagesAnalyzed: 0 }),
    listRanks: async () => [],
    saveRank: async (payload) => ({
      id: crypto.randomUUID(),
      keyword: payload.keyword,
      domain: payload.domain,
      at: new Date().toISOString(),
      engines: payload.engines,
    }),
    fetchMetrika: async () => ({ visits: 0, rows: [], error: 'Metrika not yet ported to Go' }),

    importCsvGeneric: async () => ({ error: 'CSV import not yet ported to Go' }),
    importCsvDialog: async () => ({ ok: false, error: 'CSV import dialog not available in browser mode' }),

    getSchedule: async () => ({
      enabled: false,
      cronLike: 'daily' as const,
      url: '',
      keyword: '',
      lastRunAt: null,
    }),
    saveSchedule: async () => ({ ok: true }),

    listProjects: () => apiGet<SeoProject[]>('/api/projects'),
    getActiveProject: () => apiGet<SeoProject | null>('/api/projects/active'),
    setActiveProject: async (id) => {
      const res = await apiPost<SeoProject | null | { ok?: boolean; error?: string }>(
        '/api/projects/active',
        { id },
      );
      if (res && typeof res === 'object' && 'ok' in res && res.ok === false) {
        throw new Error(
          (res as { error?: string; message?: string }).error ??
            (res as { message?: string }).message ??
            'Failed to set active project',
        );
      }
      return res as SeoProject | null;
    },
    createProject: (input: CreateProjectInput) => apiPost<SeoProject>('/api/projects/create', input),
    updateProject: (id, patch: UpdateProjectInput) =>
      apiPost<SeoProject | null>('/api/projects/update', { id, patch }),
    deleteProject: (id) =>
      apiPost<{ ok: boolean }>('/api/projects/delete', { id }).then((r) => r.ok),
    listProjectMemory: (projectId) =>
      apiGet<ProjectMemoryNote[]>(
        `/api/projects/memory${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`,
      ),
    addProjectMemory: (text, projectId) =>
      apiPost<ProjectMemoryNote | null>('/api/projects/memory', { text, projectId }),

    getSystemLoad: () => apiGet('/api/system/load'),

    fetchGooglebotView: (request: string | FetchAsBotRequest) =>
      apiPost<FetchAsBotResponse>(
        '/api/googlebot/view',
        typeof request === 'string' ? { url: request } : request,
        120_000,
      ),
    submitIndexNow: async () => ({
      ok: false,
      host: '',
      submitted: 0,
      batches: 0,
      key: '',
      keyFileHint: '',
      statusCodes: [],
      error: 'IndexNow not yet ported to Go',
    }),
    downloadIndexNowKey: async () => ({ ok: false, canceled: true }),
    getHeadChecklist: async () => ({ avgScore: null, pagesScored: 0, failRateById: [] }),

    openExternal: async (url) => {
      if (typeof window !== 'undefined' && 'Neutralino' in window) {
        try {
          // @ts-expect-error Neutralino global
          await window.Neutralino.os.open(url);
          return { ok: true as const };
        } catch {
          /* fallback */
        }
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      return { ok: true as const };
    },

    checkKeywordMentions: async (input) => {
      const res = await apiPost<{
        ok: boolean;
        keyword?: string;
        results?: { url: string; found: boolean; count: number }[];
        error?: string;
      }>('/api/labs/mentions', {
        keyword: input.keywords[0] ?? '',
        urls: input.scopeUrls ?? [],
      });
      if (!res.ok) {
        return { cells: [], pagesChecked: 0, keywordsChecked: 0, error: res.error };
      }
      const cells = (res.results ?? []).flatMap((r) =>
        r.found
          ? [{ keyword: input.keywords[0] ?? '', pageUrl: r.url, locations: ['body' as const] }]
          : [],
      );
      return {
        cells,
        pagesChecked: res.results?.length ?? 0,
        keywordsChecked: input.keywords.length,
      };
    },

    extractSitemapUrls: async (input) => {
      const res = await apiPost<{ ok: boolean; urls?: string[]; urlCount?: number; error?: string }>(
        '/api/labs/sitemap',
        { url: input.sitemapUrl },
      );
      if (!res.ok) {
        return { urls: [], count: 0, error: res.error };
      }
      return { urls: res.urls ?? [], count: res.urlCount ?? 0 };
    },

    checkOutboundLinks: async () => {
      const res = await apiPost<{ ok: boolean; issues?: unknown[]; error?: string }>(
        '/api/labs/outbound',
        {},
      );
      return {
        broken: [],
        checked: 0,
        skipped: 0,
        issuesAdded: res.issues?.length ?? 0,
        error: res.error,
      };
    },

    onCrawlProgress: (handler) =>
      connectCrawlEvents((type, data) => {
        if (type === 'progress') handler(data as CrawlProgress);
      }),
    onCrawlPage: (handler) =>
      connectCrawlEvents((type, data) => {
        if (type === 'page') handler(normalizeCrawledPage(data as CrawledPage));
      }),
    onCrawlFinished: (handler) =>
      connectCrawlEvents((type, data) => {
        if (type === 'finished') handler(normalizeCrawlState(data as CrawlState));
      }),
    onCrawlError: (handler) =>
      connectCrawlEvents((type, data) => {
        if (type === 'error') handler(data as { message: string });
      }),
  };
}

export function installOpenSpiderApi(): void {
  initExtensionTransport();
  window.openspider = createOpenSpiderApi();
}
