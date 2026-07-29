/** Actionable recommendations derived from crawl issues, metrics, and shadow analysis. */
import type {
  ReportRecommendation,
  ReportRecommendationId,
  ReportRecommendationPriority,
  ShadowRiskAnalysis,
} from '../types/audit.types';
import type { SeoIssue } from '../types/crawl.types';
import type { ReportAuditSnapshot, ReportSummary } from '../types/report.types';
import { analyzeShadowRisk, countThinContentIssues, type ShadowRiskInput } from './shadow-risk.utils';

export interface ReportRecommendationsInput {
  summary: ReportSummary;
  issues: SeoIssue[];
  audit?: ReportAuditSnapshot;
  shadowRisk?: ShadowRiskAnalysis;
}

function push(
  list: ReportRecommendation[],
  id: ReportRecommendationId,
  priority: ReportRecommendationPriority,
  params?: Record<string, string | number>,
): void {
  if (list.some((r) => r.id === id)) return;
  list.push({ id, priority, params });
}

export function buildReportRecommendations(input: ReportRecommendationsInput): ReportRecommendation[] {
  const { summary, issues, audit } = input;
  const seo = summary.seo;
  const local = audit?.localMetrics;
  const recs: ReportRecommendation[] = [];

  const shadow =
    input.shadowRisk ??
    analyzeShadowRisk({
      serp: audit?.serp,
      local: audit?.localMetrics,
      seo,
      llms: audit?.llms,
      thinContentCount: countThinContentIssues(issues),
    });

  if (summary.errors > 0) {
    push(recs, 'fix-blocking-errors', 'high', { count: summary.errors });
  }

  if (seo && seo.topIssueCodes.length > 0) {
    const top = seo.topIssueCodes[0]!;
    push(recs, 'fix-top-issues', summary.errors > 0 ? 'high' : 'medium', {
      code: top.code,
      count: top.count,
    });
  }

  const indexedSignal = audit?.serp?.siteStats?.indexedSignal;
  if (indexedSignal === 'none' || indexedSignal === 'weak') {
    push(recs, 'restore-indexation', 'high', {
      signal: indexedSignal ?? 'none',
      hits: audit?.serp?.siteStats?.bestHitCount ?? 0,
    });
  }

  if (seo && seo.okPages > 0 && seo.noindexPages >= 1) {
    const pct = Math.round((seo.noindexPages / seo.okPages) * 100);
    if (pct >= 15) {
      push(recs, 'reduce-noindex', pct >= 40 ? 'high' : 'medium', {
        count: seo.noindexPages,
        pct,
      });
    }
  }

  if (seo && seo.soft404Pages >= 1) {
    push(recs, 'fix-soft404', seo.soft404Pages >= 3 ? 'high' : 'medium', {
      count: seo.soft404Pages,
    });
  }

  if (local && local.orphans >= 2) {
    push(recs, 'link-orphans', local.orphans >= 5 ? 'high' : 'medium', {
      count: local.orphans,
    });
  }

  const thinCount = countThinContentIssues(issues);
  if (thinCount >= 2) {
    push(recs, 'expand-thin-content', thinCount >= 5 ? 'high' : 'medium', {
      count: thinCount,
    });
  }

  if (audit?.serp) {
    const ranks = audit.serp.engines
      .filter((e) => (e.kind ?? 'keyword') === 'keyword')
      .map((e) => e.domainRank)
      .filter((r): r is number => r != null);
    const best = ranks.length ? Math.min(...ranks) : null;
    if (best == null || best > 10) {
      push(recs, 'improve-serp-snippet', 'medium', {
        keyword: audit.serp.keyword,
        rank: best ?? '—',
      });
    }
  } else if (!audit?.serp && summary.pages > 0) {
    push(recs, 'run-serp-check', 'low');
  }

  if (audit?.llms && !audit.llms.ok) {
    push(recs, 'add-llms-txt', 'low');
  }

  if (shadow.band === 'likely') {
    push(recs, 'shadow-likely', 'high', { points: shadow.riskPoints });
  } else if (shadow.band === 'watch') {
    push(recs, 'shadow-watch', 'medium', { points: shadow.riskPoints });
  }

  const order: Record<ReportRecommendationPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return recs.sort((a, b) => order[a.priority] - order[b.priority]);
}
