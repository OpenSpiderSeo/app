/** Типы SEO-отчёта и сравнения. */
import type {
  FullAuditResult,
  LighthouseScores,
  LocalMetricsSnapshot,
  ReportRecommendation,
  SerpReport,
  ShadowRiskAnalysis,
} from './audit.types';
import type { PagePreviewData } from './preview.types';
import type { CrawlOptions, CrawlState } from './crawl.types';

export const ReportFormatVersion = 2 as const;

/** Optional unified snapshot from full audit / live metrics (additive v2). */
export interface ReportAuditSnapshot {
  keyword?: string;
  /** Composite health 0–100 from full audit sections. */
  healthScore?: number;
  sections?: FullAuditResult['sections'];
  localMetrics?: LocalMetricsSnapshot;
  lighthouse?: LighthouseScores | null;
  serp?: SerpReport | null;
  llms?: { ok: boolean; status: number; url: string } | null;
  previews?: PagePreviewData[];
  finishedAt?: string;
  shadowRisk?: ShadowRiskAnalysis;
  recommendations?: ReportRecommendation[];
}

export interface ReportSummary {
  pages: number;
  errors: number;
  warnings: number;
  infos: number;
  startUrl: string;
  /** SEO specialist rollup — optional for older reports. */
  seo?: SeoAuditMetrics;
}

export interface SeoAuditMetrics {
  okPages: number;
  indexablePages: number;
  noindexPages: number;
  withTitle: number;
  withDescription: number;
  withH1: number;
  withCanonical: number;
  withHtmlLang: number;
  withHreflang: number;
  withJsonLd: number;
  withViewport: number;
  missingAltImages: number;
  /** Pages sharing a duplicate title (all members of duplicate groups). */
  duplicateTitlePages: number;
  /** Pages sharing a duplicate meta description. */
  duplicateDescriptionPages: number;
  soft404Pages: number;
  headScore: number | null;
  contentScore: number | null;
  avgTitleLength: number | null;
  avgDescriptionLength: number | null;
  topIssueCodes: { code: string; count: number; severity: string }[];
  healthScore: number;
}

export interface SeoReport {
  formatVersion: typeof ReportFormatVersion;
  id: string;
  title: string;
  createdAt: string;
  appVersion: string;
  options: CrawlOptions;
  summary: ReportSummary;
  state: CrawlState;
  /** Unified audit payload when full check or live metrics were captured. */
  audit?: ReportAuditSnapshot;
}

export interface HistoryListItem {
  id: string;
  title: string;
  createdAt: string;
  startUrl: string;
  pages: number;
  errors: number;
  warnings: number;
  /** SEO health 0–100 — audit.healthScore or summary.seo.healthScore. */
  healthScore: number | null;
  /** True when report includes lighthouse/SERP/local unified snapshot. */
  hasAudit: boolean;
  fileName: string;
}
