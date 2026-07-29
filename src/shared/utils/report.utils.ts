/** Сводка отчётов — чистые функции. */
import type { CrawlState } from '../types/crawl.types';
import type { FullAuditResult } from '../types/audit.types';
import type {
  ReportAuditSnapshot,
  ReportSummary,
  SeoReport,
} from '../types/report.types';
import { buildSeoAuditMetrics } from './seo-audit.utils';
import { analyzeShadowRisk, countThinContentIssues } from './shadow-risk.utils';
import { buildReportRecommendations } from './report-recommendations.utils';
import type { ReportRecommendation, ShadowRiskAnalysis } from '../types/audit.types';

export function reportHealthScore(report: SeoReport): number | null {
  return report.audit?.healthScore ?? report.summary.seo?.healthScore ?? null;
}

export function auditSnapshotFromFullAudit(audit: FullAuditResult): ReportAuditSnapshot {
  return {
    keyword: audit.keyword,
    healthScore: audit.healthScore,
    sections: audit.sections,
    localMetrics: audit.local ?? undefined,
    lighthouse: audit.lighthouse,
    serp: audit.serp,
    llms: audit.llms,
    previews: audit.previews,
    finishedAt: audit.finishedAt,
    shadowRisk: audit.shadowRisk,
    recommendations: audit.recommendations,
  };
}

function auditInsightsFromReport(report: SeoReport, audit: FullAuditResult): ReportAuditSnapshot {
  const base = auditSnapshotFromFullAudit(audit);
  const shadowRisk =
    audit.shadowRisk ??
    analyzeShadowRisk({
      serp: audit.serp,
      local: audit.local,
      seo: report.summary.seo,
      llms: audit.llms,
      thinContentCount: countThinContentIssues(report.state.issues),
    });
  const recommendations =
    audit.recommendations ??
    buildReportRecommendations({
      summary: report.summary,
      issues: report.state.issues,
      audit: base,
      shadowRisk,
    });
  return { ...base, shadowRisk, recommendations };
}

export function enrichReportWithAudit(report: SeoReport, audit: FullAuditResult): SeoReport {
  return {
    ...report,
    audit: auditInsightsFromReport(report, audit),
  };
}

export function resolveAuditInsights(report: SeoReport): {
  shadowRisk?: ShadowRiskAnalysis;
  recommendations: ReportRecommendation[];
} {
  const { audit } = report;
  if (!audit) {
    const shadowRisk = analyzeShadowRisk({
      seo: report.summary.seo,
      thinContentCount: countThinContentIssues(report.state.issues),
    });
    return {
      shadowRisk,
      recommendations: buildReportRecommendations({
        summary: report.summary,
        issues: report.state.issues,
        shadowRisk,
      }),
    };
  }

  const shadowRisk =
    audit.shadowRisk ??
    analyzeShadowRisk({
      serp: audit.serp,
      local: audit.localMetrics,
      seo: report.summary.seo,
      llms: audit.llms,
      thinContentCount: countThinContentIssues(report.state.issues),
    });

  const recommendations =
    audit.recommendations ??
    buildReportRecommendations({
      summary: report.summary,
      issues: report.state.issues,
      audit,
      shadowRisk,
    });

  return { shadowRisk, recommendations };
}

export function buildSummary(state: CrawlState, startUrl: string): ReportSummary {
  return {
    pages: state.pages.length,
    errors: state.issues.filter((i) => i.severity === 'error').length,
    warnings: state.issues.filter((i) => i.severity === 'warning').length,
    infos: state.issues.filter((i) => i.severity === 'info').length,
    startUrl: startUrl || state.progress.startUrl || '',
    seo: buildSeoAuditMetrics(state.pages, state.issues),
  };
}
