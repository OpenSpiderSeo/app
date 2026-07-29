import type { CrawlProgress } from '../types/crawl.types';
import { crawlProgressPct } from './crawl-progress.utils';

/** Progress label: percent, or empty while truly indeterminate. */
export function crawlProgressLabel(progress: CrawlProgress): string {
  const pct = crawlProgressPct(progress);
  if (pct != null) return `${pct}%`;
  return '';
}

/**
 * Limits line: `12/500 · depth≤3` — depth is a cap, not current depth.
 */
export function crawlLimitLabel(progress: CrawlProgress): string | null {
  const parts: string[] = [];
  if (progress.maxUrls != null && progress.maxUrls > 0) {
    parts.push(`${progress.fetched}/${progress.maxUrls}`);
  }
  if (progress.maxDepth != null && progress.maxDepth > 0) {
    parts.push(`depth≤${progress.maxDepth}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function crawlIssueCount(progress: CrawlProgress): number {
  if (progress.issueCount != null && progress.issueCount >= 0) {
    return progress.issueCount;
  }
  return 0;
}

export type CrawlFetchStatVars = {
  fetched: number;
  queued: number;
  active: number;
  errors: number;
};

/** Vars for `crawl.fetched` — omit zero queue/active noise via formatter below. */
export function crawlFetchStatVars(progress: CrawlProgress): CrawlFetchStatVars {
  return {
    fetched: progress.fetched,
    queued: progress.queued,
    active: Math.max(0, progress.active ?? 0),
    errors: progress.errors,
  };
}

/**
 * Build "fetched · queue · active · errors" without showing idle zeros.
 * Queue 0 while workers are in flight → show active instead of misleading empty queue.
 */
export function formatCrawlFetchStats(
  progress: CrawlProgress,
  labels: { fetched: string; queue: string; active: string; errors: string },
): string {
  const active = Math.max(0, progress.active ?? 0);
  const parts = [`${labels.fetched} ${progress.fetched}`];
  if (progress.queued > 0) {
    parts.push(`${labels.queue} ${progress.queued}`);
  }
  if (active > 0) {
    parts.push(`${labels.active} ${active}`);
  }
  parts.push(`${labels.errors} ${progress.errors}`);
  return parts.join(' · ');
}
