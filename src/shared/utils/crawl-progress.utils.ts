import { CrawlStatus, type CrawlProgress, type CrawlStatusName } from '../types/crawl.types';

export type CrawlProgressDisplay =
  | { mode: 'indeterminate' }
  | { mode: 'determinate'; pct: number };

const IN_PROGRESS: ReadonlySet<CrawlStatusName> = new Set([
  CrawlStatus.Running,
  CrawlStatus.Pausing,
  CrawlStatus.Stopping,
  CrawlStatus.Paused,
]);

/**
 * Honest crawl bar progress:
 * - finished → 100%
 * - maxUrls set → fetched / maxUrls (cap 99% while not finished)
 * - otherwise → fetched / (fetched + queued + active), cap 99% while not finished
 * - nothing known yet → indeterminate
 */
export function computeCrawlProgressDisplay(progress: CrawlProgress): CrawlProgressDisplay {
  const { status, fetched, queued, maxUrls } = progress;
  const active = Math.max(0, progress.active ?? 0);

  if (status === CrawlStatus.Finished) {
    return { mode: 'determinate', pct: 100 };
  }

  const inProgress = IN_PROGRESS.has(status);

  if (maxUrls != null && maxUrls > 0) {
    const raw = Math.round((fetched / maxUrls) * 100);
    return { mode: 'determinate', pct: inProgress ? Math.min(99, raw) : raw };
  }

  const pending = queued + active;
  const total = fetched + pending;
  if (total === 0) {
    return { mode: 'indeterminate' };
  }

  // Queue drained but workers still fetching → keep moving bar via active jobs.
  const raw = Math.round((fetched / total) * 100);
  return { mode: 'determinate', pct: inProgress ? Math.min(99, Math.max(1, raw)) : raw };
}

/** Percent for UI, or null when the bar should pulse (indeterminate). */
export function crawlProgressPct(progress: CrawlProgress): number | null {
  const display = computeCrawlProgressDisplay(progress);
  return display.mode === 'determinate' ? display.pct : null;
}
