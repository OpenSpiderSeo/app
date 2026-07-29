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

const ACTIVE: ReadonlySet<CrawlStatusName> = new Set([
  CrawlStatus.Running,
  CrawlStatus.Pausing,
  CrawlStatus.Stopping,
]);

/**
 * Honest crawl bar progress:
 * - finished → 100%
 * - maxUrls set → fetched / maxUrls (cap 99% while not finished)
 * - unlimited + queue empty while running → indeterminate (in-flight workers)
 * - otherwise → fetched / (fetched + queued), cap 99% while not finished
 */
export function computeCrawlProgressDisplay(progress: CrawlProgress): CrawlProgressDisplay {
  const { status, fetched, queued, maxUrls } = progress;

  if (status === CrawlStatus.Finished) {
    return { mode: 'determinate', pct: 100 };
  }

  const inProgress = IN_PROGRESS.has(status);

  if (maxUrls != null && maxUrls > 0) {
    const raw = Math.round((fetched / maxUrls) * 100);
    return { mode: 'determinate', pct: inProgress ? Math.min(99, raw) : raw };
  }

  if (ACTIVE.has(status) && queued === 0) {
    return { mode: 'indeterminate' };
  }

  const total = fetched + queued;
  if (total === 0) {
    return { mode: 'indeterminate' };
  }

  const raw = Math.round((fetched / total) * 100);
  return { mode: 'determinate', pct: inProgress ? Math.min(99, raw) : raw };
}

/** Percent for UI, or null when the bar should pulse (indeterminate). */
export function crawlProgressPct(progress: CrawlProgress): number | null {
  const display = computeCrawlProgressDisplay(progress);
  return display.mode === 'determinate' ? display.pct : null;
}
