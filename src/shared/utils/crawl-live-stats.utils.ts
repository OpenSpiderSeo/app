import type { CrawlProgress } from '../types/crawl.types';
import { crawlProgressPct } from './crawl-progress.utils';

/** Progress label: percent, or "~" while workers are in flight. */
export function crawlProgressLabel(progress: CrawlProgress): string {
  const pct = crawlProgressPct(progress);
  if (pct != null) return `${pct}%`;
  return '…';
}

export function crawlLimitLabel(progress: CrawlProgress): string | null {
  const parts: string[] = [];
  if (progress.maxUrls != null && progress.maxUrls > 0) {
    parts.push(`${progress.fetched}/${progress.maxUrls}`);
  }
  if (progress.maxDepth != null && progress.maxDepth > 0) {
    parts.push(`depth ${progress.maxDepth}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function crawlIssueCount(progress: CrawlProgress): number {
  if (progress.issueCount != null && progress.issueCount >= 0) {
    return progress.issueCount;
  }
  return 0;
}
