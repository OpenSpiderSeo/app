/** Контракты IPC. */
import type {
  CrawlOptions,
  CrawlSessionFile,
  CrawlState,
  CrawledPage,
  CrawlProgress,
  SeoIssue,
} from './crawl.types';
import type { IntegrationDescriptor } from './integration.types';
import type { OssCredit } from '../const/oss-credits.const';
import type { LlmsTxtProbe } from './llms.types';
import type { HistoryListItem, SeoReport } from './report.types';
import type { LocaleCode } from '../const/locale.const';
import type {
  FullAuditResult,
  LighthouseScores,
  LocalMetricsSnapshot,
  SerpReport,
  AiScanResult,
  MetrikaFetchResult,
  RankCheck,
  CsvImportType,
} from './audit.types';
import type {
  KeywordMentionsInput,
  KeywordMentionsResult,
  OutboundLinksCheckInput,
  OutboundLinksCheckResult,
  SitemapExtractInput,
  SitemapExtractResult,
} from './labs-tools.types';
import type {
  CreateProjectInput,
  ProjectMemoryNote,
  SeoProject,
  UpdateProjectInput,
} from './project.types';

export type ScheduleCronLike = 'daily' | 'hourly';

export interface ScheduleConfig {
  enabled: boolean;
  cronLike: ScheduleCronLike;
  url: string;
  keyword: string;
  lastRunAt: string | null;
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
  /** Desktop build supports in-app updates (Neutralino TBD). */
  updatesSupported: boolean;
}

export type AppUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface AppUpdateStatus {
  phase: AppUpdatePhase;
  version?: string;
  progress?: number;
  message?: string;
}

export interface SystemLoadSnapshot {
  cpuPercent: number;
  ramUsedBytes: number;
  ramTotalBytes: number;
  ramPercent: number;
  sampledAt: string;
}

export interface GooglebotHeading {
  level: 1 | 2 | 3;
  text: string;
}

export interface GooglebotViewResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  contentType: string | null;
  contentLanguage: string | null;
  acceptLanguage: string;
  languageId: string | null;
  userAgent: string;
  profileId: string;
  device: 'desktop' | 'mobile';
  viewportWidth: number;
  robotsTxt: {
    url: string;
    fetched: boolean;
    allowed: boolean | null;
    note: string;
  };
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  robotsMeta: string | null;
  htmlLang: string | null;
  hreflang: { lang: string; href: string }[];
  hreflangHasSelf: boolean;
  hreflangHasXDefault: boolean;
  headings: GooglebotHeading[];
  textPreview: string;
  wordCount: number;
  links: string[];
  noindex: boolean;
  fetchedAt: string;
  note: string;
}

export interface FetchAsBotRequest {
  url: string;
  profile?: string;
  userAgent?: string;
  acceptLanguage?: string;
  compareDesktopMobile?: boolean;
  /** Language preset ids (ru, en, de…) — fetch Googlebot desktop per language. */
  compareLanguages?: string[];
}

export interface FetchAsBotResponse {
  views: GooglebotViewResult[];
}

export type CrawlStartResult = { ok: true } | { ok: false; error: string };

export interface IntegrationSecrets {
  psiApiKey?: string;
  metrikaCounterId?: string;
  metrikaOauthToken?: string;
  gscSiteUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  /** IndexNow API key (also publish https://host/{key}.txt). */
  indexNowKey?: string;
}

export interface CustomJsRow {
  url: string;
  result: unknown;
  error?: string;
}

export interface RankSavePayload {
  keyword: string;
  domain: string;
  engines: { engine: string; rank: number | null }[];
}

export interface OpenSpiderApi {
  getAppInfo: () => Promise<AppInfo>;
  checkForUpdates: () => Promise<AppUpdateStatus>;
  installUpdate: () => Promise<{ ok: true } | { ok: false; error: string }>;
  getUpdateStatus: () => Promise<AppUpdateStatus>;
  onUpdateStatus: (handler: (status: AppUpdateStatus) => void) => () => void;
  startCrawl: (options: CrawlOptions) => Promise<CrawlStartResult>;
  stopCrawl: () => Promise<void>;
  pauseCrawl: () => Promise<{ ok: true } | { ok: false; error: string }>;
  resumeCrawl: () => Promise<CrawlStartResult>;
  getCrawlState: () => Promise<CrawlState>;
  getCrawlConfig: () => Promise<Omit<CrawlOptions, 'startUrl'>>;
  saveCrawlConfig: (config: Omit<CrawlOptions, 'startUrl'>) => Promise<{ ok: true }>;
  searchHtml: (
    pattern: string,
  ) => Promise<
    | { url: string; matches: number; snippet: string }[]
    | { error: string }
  >;
  extractCss: (
    selector: string,
  ) => Promise<{ url: string; values: string[] }[] | { error: string }>;
  getLinkGraph: () => Promise<{
    nodes: { id: string; label: string; depth: number }[];
    edges: { source: string; target: string }[];
  }>;
  saveSession: () => Promise<{ path: string } | { error: string }>;
  loadSession: () => Promise<{ ok: true; state: CrawlState } | { ok: false; error: string }>;
  listIntegrations: () => Promise<IntegrationDescriptor[]>;
  getSecrets: () => Promise<IntegrationSecrets>;
  saveSecrets: (patch: IntegrationSecrets) => Promise<IntegrationSecrets>;
  listOssCredits: () => Promise<OssCredit[]>;
  exportSitemap: () => Promise<{ path: string } | { error: string }>;
  probeLlmsTxt: (origin: string) => Promise<LlmsTxtProbe>;
  runPagespeed: (url: string, preferLocal?: boolean) => Promise<LighthouseScores>;
  runSerp: (domainOrUrl: string, keyword: string) => Promise<SerpReport>;
  runFullAudit: (payload: {
    url: string;
    keyword: string;
    runCrawl?: boolean;
  }) => Promise<FullAuditResult>;
  getLocalMetrics: () => Promise<LocalMetricsSnapshot>;
  listHistory: () => Promise<HistoryListItem[]>;
  loadHistory: (id: string) => Promise<SeoReport | null>;
  deleteHistory: (id: string) => Promise<boolean>;
  saveCurrentToHistory: (title?: string) => Promise<HistoryListItem | { error: string }>;
  getCurrentReport: () => Promise<SeoReport>;
  exportReport: (id?: string) => Promise<{ path: string } | { error: string }>;
  exportReportPdf: (payload?: {
    id?: string;
    locale?: LocaleCode;
  }) => Promise<{ path: string } | { error: string }>;
  autoExportReport: (title?: string) => Promise<
    | { ok: true; path: string; history: HistoryListItem }
    | { ok: false; error: string }
  >;
  autoExportSitemap: () => Promise<{ path: string } | { error: string }>;
  importReport: () => Promise<{ ok: true; report: SeoReport } | { ok: false; error: string }>;
  exportCsvPages: () => Promise<{ path: string } | { error: string }>;
  exportCsvIssues: () => Promise<{ path: string } | { error: string }>;
  runCustomJs: (script: string) => Promise<CustomJsRow[] | { error: string }>;
  runAiScan: () => Promise<AiScanResult>;
  listRanks: () => Promise<RankCheck[]>;
  saveRank: (payload: RankSavePayload) => Promise<RankCheck>;
  fetchMetrika: () => Promise<MetrikaFetchResult>;
  importCsvGeneric: (
    type: CsvImportType,
    content: string,
  ) => Promise<{ count: number } | { error: string }>;
  importCsvDialog: (
    type: CsvImportType,
  ) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
  onCrawlProgress: (handler: (progress: CrawlProgress) => void) => () => void;
  onCrawlPage: (handler: (page: CrawledPage) => void) => () => void;
  onCrawlFinished: (handler: (state: CrawlState) => void) => () => void;
  onCrawlError: (handler: (payload: { message: string }) => void) => () => void;
  getSchedule: () => Promise<ScheduleConfig>;
  saveSchedule: (config: ScheduleConfig) => Promise<{ ok: true }>;
  listProjects: () => Promise<SeoProject[]>;
  getActiveProject: () => Promise<SeoProject | null>;
  setActiveProject: (id: string | null) => Promise<SeoProject | null>;
  createProject: (input: CreateProjectInput) => Promise<SeoProject>;
  updateProject: (id: string, patch: UpdateProjectInput) => Promise<SeoProject | null>;
  deleteProject: (id: string) => Promise<boolean>;
  listProjectMemory: (projectId?: string) => Promise<ProjectMemoryNote[]>;
  addProjectMemory: (text: string, projectId?: string) => Promise<ProjectMemoryNote | null>;
  getSystemLoad: () => Promise<SystemLoadSnapshot>;
  fetchGooglebotView: (request: string | FetchAsBotRequest) => Promise<FetchAsBotResponse>;
  submitIndexNow: (key?: string) => Promise<IndexNowSubmitResult>;
  downloadIndexNowKey: (
    key?: string,
  ) => Promise<
    | { ok: true; path: string; key: string; hint: string }
    | { ok: false; canceled: true }
  >;
  getHeadChecklist: () => Promise<HeadChecklistSiteSummary>;
  openExternal: (url: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  checkKeywordMentions: (input: KeywordMentionsInput) => Promise<KeywordMentionsResult>;
  extractSitemapUrls: (input: SitemapExtractInput) => Promise<SitemapExtractResult>;
  checkOutboundLinks: (input: OutboundLinksCheckInput) => Promise<OutboundLinksCheckResult>;
}

export interface IndexNowSubmitResult {
  ok: boolean;
  host: string;
  submitted: number;
  batches: number;
  key: string;
  keyFileHint: string;
  statusCodes: number[];
  error?: string;
}

export interface HeadChecklistSiteSummary {
  avgScore: number | null;
  pagesScored: number;
  failRateById: { id: string; label: string; failPct: number }[];
}

export type {
  CrawlSessionFile,
  SeoIssue,
  OssCredit,
  LlmsTxtProbe,
  HistoryListItem,
  SeoReport,
  FullAuditResult,
  LighthouseScores,
  LocalMetricsSnapshot,
  SerpReport,
  AiScanResult,
  MetrikaFetchResult,
  RankCheck,
  CsvImportType,
  SeoProject,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectMemoryNote,
};
