/** Heuristic «shadow» risk — soft filter / weak indexation signals from crawl + SERP. */
import type {
  LocalMetricsSnapshot,
  SerpReport,
  ShadowRiskAnalysis,
  ShadowRiskBand,
  ShadowRiskSignal,
  ShadowSignalId,
} from '../types/audit.types';
import type { SeoAuditMetrics } from '../types/report.types';
import { IssueCode } from '../types/crawl.types';

export interface ShadowRiskInput {
  serp?: SerpReport | null;
  local?: LocalMetricsSnapshot | null;
  seo?: SeoAuditMetrics;
  llms?: { ok: boolean; status: number; url: string } | null;
  thinContentCount?: number;
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

function pushSignal(
  signals: ShadowRiskSignal[],
  id: ShadowSignalId,
  weight: number,
  params?: Record<string, string | number>,
): void {
  signals.push({ id, weight, params });
}

function bandFromPoints(points: number): ShadowRiskBand {
  if (points >= 6) return 'likely';
  if (points >= 3) return 'watch';
  return 'none';
}

function httpErrorCount(local: LocalMetricsSnapshot): number {
  const b = local.buckets;
  const x4 = b.find((x) => x.label === '4xx')?.count ?? 0;
  const x5 = b.find((x) => x.label === '5xx')?.count ?? 0;
  const err = b.find((x) => x.label === 'ERR')?.count ?? 0;
  return x4 + x5 + err;
}

function bestKeywordRank(serp: SerpReport | null | undefined): number | null {
  if (!serp) return null;
  const ranks = serp.engines
    .filter((e) => (e.kind ?? (e.query.startsWith('site:') ? 'site' : 'keyword')) === 'keyword')
    .map((e) => e.domainRank)
    .filter((r): r is number => r != null);
  return ranks.length ? Math.min(...ranks) : null;
}

export function analyzeShadowRisk(input: ShadowRiskInput): ShadowRiskAnalysis {
  const signals: ShadowRiskSignal[] = [];
  const { serp, local, seo, llms } = input;
  const thinCount = input.thinContentCount ?? 0;

  const indexedSignal = serp?.siteStats?.indexedSignal;
  const siteHits = serp?.siteStats?.bestHitCount ?? 0;
  const bestRank = bestKeywordRank(serp);

  if (indexedSignal === 'none') {
    pushSignal(signals, 'indexed-none', 4, { hits: siteHits });
  } else if (indexedSignal === 'weak') {
    pushSignal(signals, 'indexed-weak', 2, { hits: siteHits });
  }

  if (serp?.siteStats?.archive && indexedSignal === 'none' && serp.siteStats.archive.hitCount > 0) {
    pushSignal(signals, 'archive-only', 1, { hits: serp.siteStats.archive.hitCount });
  }

  const hasIndexFootprint = siteHits >= 1 || indexedSignal === 'weak' || indexedSignal === 'strong';
  if (hasIndexFootprint && (bestRank == null || bestRank > 20)) {
    pushSignal(signals, 'rank-missing-indexed', 2, {
      rank: bestRank ?? '—',
      hits: siteHits,
      keyword: serp?.keyword ?? '',
    });
  }

  if (seo && seo.okPages > 0) {
    const softPct = pct(seo.soft404Pages, seo.okPages);
    if (seo.soft404Pages >= 2 && softPct >= 10) {
      pushSignal(signals, 'high-soft404', 2, { count: seo.soft404Pages, pct: softPct });
    }

    const noindexPct = pct(seo.noindexPages, seo.okPages);
    if (seo.noindexPages >= 1 && noindexPct >= 25) {
      pushSignal(signals, 'high-noindex', 2, { count: seo.noindexPages, pct: noindexPct });
    }
  }

  if (local && local.pages > 0) {
    const errCount = httpErrorCount(local);
    const errPct = pct(errCount, local.pages);
    if (errCount >= 1 && errPct >= 15) {
      pushSignal(signals, 'high-http-errors', 2, { count: errCount, pct: errPct });
    }

    const orphanPct = pct(local.orphans, local.pages);
    if (local.orphans >= 5 || (local.orphans >= 2 && orphanPct >= 20)) {
      pushSignal(signals, 'many-orphans', 1, { count: local.orphans, pct: orphanPct });
    }

    if (local.errors >= 5) {
      pushSignal(signals, 'crawl-errors', 2, { count: local.errors });
    } else if (local.errors >= 1) {
      pushSignal(signals, 'crawl-errors', 1, { count: local.errors });
    }

    if (local.indexableShare < 50 && local.pages >= 3 && !signals.some((s) => s.id === 'high-noindex')) {
      pushSignal(signals, 'high-noindex', 1, { pct: 100 - local.indexableShare });
    }
  }

  const thin = thinCount ?? 0;
  if (thin >= 3) {
    pushSignal(signals, 'thin-content', 1, { count: thin });
  } else if (thin >= 1 && local && local.pages <= 5) {
    pushSignal(signals, 'thin-content', 1, { count: thin });
  }

  if (llms && !llms.ok) {
    pushSignal(signals, 'llms-missing', 1);
  }

  const riskPoints = signals.reduce((s, x) => s + x.weight, 0);
  return {
    band: bandFromPoints(riskPoints),
    riskPoints,
    signals,
  };
}

export function countThinContentIssues(issues: { code: string }[]): number {
  return issues.filter((i) => i.code === IssueCode.ThinContent).length;
}

export function shadowBandTone(band: ShadowRiskBand): 'ok' | 'warn' | 'bad' {
  if (band === 'likely') return 'bad';
  if (band === 'watch') return 'warn';
  return 'ok';
}
