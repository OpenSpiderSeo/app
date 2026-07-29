import type { RankCheck } from '../../../shared/types/audit.types';
import type { CrawledPage, SeoIssue } from '../../../shared/types/crawl.types';
import type { HistoryListItem } from '../../../shared/types/report.types';
import { IssueSeverity } from '../../../shared/types/crawl.types';

export interface ChartDatum {
  name: string;
  value: number;
  fill?: string;
}

export interface RankSeriesPoint {
  at: string;
  label: string;
  rank: number | null;
}

export interface HealthTrendPoint {
  at: string;
  label: string;
  health: number;
  errors: number;
}

function isNoindex(page: CrawledPage): boolean {
  return /\bnoindex\b/i.test(page.robotsMeta ?? '');
}

function isOkHttp(page: CrawledPage): boolean {
  return !page.error && page.statusCode >= 200 && page.statusCode < 300;
}

export function issuesBySeverity(issues: SeoIssue[]): ChartDatum[] {
  const counts = {
    [IssueSeverity.Error]: 0,
    [IssueSeverity.Warning]: 0,
    [IssueSeverity.Info]: 0,
  };
  for (const issue of issues) {
    counts[issue.severity] += 1;
  }
  return [
    { name: IssueSeverity.Error, value: counts[IssueSeverity.Error] },
    { name: IssueSeverity.Warning, value: counts[IssueSeverity.Warning] },
    { name: IssueSeverity.Info, value: counts[IssueSeverity.Info] },
  ].filter((d) => d.value > 0);
}

/** Fallback when TanStack pages cache is empty but GET /api/metrics/local has buckets. */
export function httpStatusBucketsFromLocal(
  buckets: { label: string; count: number }[],
): ChartDatum[] {
  const alias: Record<string, string> = { ERR: 'other' };
  return buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: alias[b.label] ?? b.label,
      value: b.count,
    }));
}

export function httpStatusBuckets(pages: CrawledPage[]): ChartDatum[] {
  const buckets = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };
  for (const page of pages) {
    if (page.error || page.statusCode === 0) {
      buckets.other += 1;
      continue;
    }
    const code = page.statusCode;
    if (code >= 200 && code < 300) buckets['2xx'] += 1;
    else if (code >= 300 && code < 400) buckets['3xx'] += 1;
    else if (code >= 400 && code < 500) buckets['4xx'] += 1;
    else if (code >= 500) buckets['5xx'] += 1;
    else buckets.other += 1;
  }
  return Object.entries(buckets)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);
}

export function indexationSplit(pages: CrawledPage[]): ChartDatum[] {
  const ok = pages.filter(isOkHttp);
  const noindex = ok.filter(isNoindex).length;
  const indexable = Math.max(0, ok.length - noindex);
  const blocked = pages.length - ok.length;
  return [
    { name: 'indexable', value: indexable },
    { name: 'noindex', value: noindex },
    { name: 'nonOk', value: blocked },
  ].filter((d) => d.value > 0);
}

/** Best (lowest) rank per check — null ranks excluded from min. */
export function rankHistorySeries(ranks: RankCheck[]): RankSeriesPoint[] {
  const sorted = [...ranks].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  return sorted.map((r) => {
    const numeric = r.engines.map((e) => e.rank).filter((n): n is number => n != null);
    const best = numeric.length > 0 ? Math.min(...numeric) : null;
    const d = new Date(r.at);
    return {
      at: r.at,
      label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      rank: best,
      keyword: r.keyword,
    };
  }) as (RankSeriesPoint & { keyword: string })[];
}

export function rankHistoryByKeyword(
  ranks: RankCheck[],
): { keyword: string; points: RankSeriesPoint[] }[] {
  const byKw = new Map<string, RankCheck[]>();
  for (const r of ranks) {
    const list = byKw.get(r.keyword) ?? [];
    list.push(r);
    byKw.set(r.keyword, list);
  }
  return [...byKw.entries()]
    .map(([keyword, list]) => ({
      keyword,
      points: rankHistorySeries(list),
    }))
    .filter((s) => s.points.some((p) => p.rank != null))
    .slice(0, 5);
}

export function healthTrendFromHistory(items: HistoryListItem[]): HealthTrendPoint[] {
  return [...items]
    .filter((i) => i.healthScore != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-12)
    .map((i) => {
      const d = new Date(i.createdAt);
      return {
        at: i.createdAt,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        health: i.healthScore!,
        errors: i.errors,
      };
    });
}
