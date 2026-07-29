/** Full SEO audit, Lighthouse/PSI, SERP, local metrics. */
import type { PagePreviewData } from './preview.types';

/** Single Lighthouse audit row extracted from PSI (subset of full report). */
export interface LighthouseAuditItem {
  id: string;
  title: string;
  description?: string;
  /** 0–100 when numeric/binary; null for informative/manual. */
  score: number | null;
  displayValue?: string;
  /** failed = score below pass threshold; opportunity = perf savings hint */
  kind: 'failed' | 'opportunity' | 'informative';
}

export interface LighthouseScores {
  url: string;
  performance: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  ttfbMs: number | null;
  source: 'pagespeed' | 'local-lab';
  fetchedAt: string;
  error?: string;
  /** Machine code from Go — UI maps to i18n (psi_rate_limited, psi_no_key, …). */
  errorCode?: 'psi_rate_limited' | 'psi_unavailable' | 'psi_no_key' | string;
  /** Populated from PSI API; local-lab probe has no full audit list. */
  audits?: LighthouseAuditItem[];
}

export interface SerpHit {
  position: number;
  title: string;
  url: string;
  snippet: string;
}

export interface SerpEngineResult {
  engine: 'google' | 'bing' | 'yandex' | 'duckduckgo';
  query: string;
  /** keyword = organic query; site = site:domain indexation probe */
  kind?: 'keyword' | 'site';
  hits: SerpHit[];
  domainRank: number | null;
  /** For site: queries — approximate pages found in SERP */
  indexedApprox?: number;
  error?: string;
}

export interface SerpSiteEngineStat {
  engine: SerpEngineResult['engine'];
  hitCount: number;
  topUrls: string[];
  error?: string;
}

export interface SerpReport {
  domain: string;
  keyword: string;
  engines: SerpEngineResult[];
  /** Aggregated site:<domain> indexation signal across engines */
  siteStats?: {
    domain: string;
    engines: SerpSiteEngineStat[];
    bestHitCount: number;
    indexedSignal: 'strong' | 'weak' | 'none';
    /** When live SERP is blocked — Wayback CDX archive signal */
    archive?: {
      hitCount: number;
      topUrls: string[];
      note: string;
    };
  };
  fetchedAt: string;
}

export interface LocalMetricsSnapshot {
  pages: number;
  errors: number;
  warnings: number;
  infos: number;
  orphans: number;
  avgInlinks: number;
  avgDepth: number;
  indexableShare: number;
  withTitle: number;
  withDescription: number;
  withJsonLd: number;
  withViewport: number;
  healthScore: number;
  fixProgress: number;
  buckets: { label: string; count: number; tone: 'ok' | 'warn' | 'bad' | 'info' }[];
}

export interface FullAuditResult {
  url: string;
  keyword: string;
  startedAt: string;
  finishedAt: string;
  healthScore: number;
  sections: {
    id: string;
    title: string;
    score: number;
    status: 'pass' | 'warn' | 'fail';
    notes: string[];
  }[];
  lighthouse: LighthouseScores | null;
  serp: SerpReport | null;
  local: LocalMetricsSnapshot | null;
  llms: { ok: boolean; status: number; url: string } | null;
  /** SERP + social preview for start URL and sample pages. */
  previews?: PagePreviewData[];
  shadowRisk?: ShadowRiskAnalysis;
  recommendations?: ReportRecommendation[];
}

export interface AiScanTip {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AiScanResult {
  tips: AiScanTip[];
  pagesAnalyzed: number;
  error?: string;
}

export interface MetrikaRow {
  url: string;
  visits: number;
}

export interface MetrikaFetchResult {
  visits: number;
  rows: MetrikaRow[];
  error?: string;
}

export interface RankEngineEntry {
  engine: string;
  rank: number | null;
}

export interface RankCheck {
  id: string;
  keyword: string;
  domain: string;
  engines: RankEngineEntry[];
  at: string;
}

export type CsvImportType = 'gsc' | 'ga4' | 'backlinks' | 'webmaster';

/** SEO «тень» — риск мягкого фильтра / слабой индексации (эвристика, не API Google). */
export type ShadowRiskBand = 'none' | 'watch' | 'likely';

export type ShadowSignalId =
  | 'indexed-none'
  | 'indexed-weak'
  | 'rank-missing-indexed'
  | 'high-soft404'
  | 'high-noindex'
  | 'high-http-errors'
  | 'many-orphans'
  | 'thin-content'
  | 'crawl-errors'
  | 'llms-missing'
  | 'archive-only';

export interface ShadowRiskSignal {
  id: ShadowSignalId;
  weight: number;
  params?: Record<string, string | number>;
}

export interface ShadowRiskAnalysis {
  band: ShadowRiskBand;
  riskPoints: number;
  signals: ShadowRiskSignal[];
}

export type ReportRecommendationPriority = 'high' | 'medium' | 'low';

export type ReportRecommendationId =
  | 'fix-blocking-errors'
  | 'restore-indexation'
  | 'reduce-noindex'
  | 'fix-soft404'
  | 'link-orphans'
  | 'expand-thin-content'
  | 'improve-serp-snippet'
  | 'run-serp-check'
  | 'add-llms-txt'
  | 'shadow-watch'
  | 'shadow-likely'
  | 'fix-top-issues';

export interface ReportRecommendation {
  id: ReportRecommendationId;
  priority: ReportRecommendationPriority;
  params?: Record<string, string | number>;
}
