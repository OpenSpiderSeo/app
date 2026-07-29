import { memo } from 'react';
import type { CrawledPage, SeoIssue } from '../../../shared/types/crawl.types';
import type { LocalMetricsSnapshot } from '../../../shared/types/audit.types';
import { HttpStatusChart } from './HttpStatusChart';
import { IndexationChart } from './IndexationChart';
import { IssuesSeverityChart } from './IssuesSeverityChart';

export const CrawlAnalyticsCharts = memo(function CrawlAnalyticsCharts({
  pages,
  issues,
  statusBuckets,
}: {
  pages: CrawledPage[];
  issues: SeoIssue[];
  statusBuckets?: LocalMetricsSnapshot['buckets'];
}) {
  if (pages.length === 0 && issues.length === 0 && !statusBuckets?.some((b) => b.count > 0)) {
    return null;
  }

  return (
    <section className="os-charts-grid grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
      <IssuesSeverityChart issues={issues} />
      <HttpStatusChart pages={pages} fallbackBuckets={statusBuckets} />
      <IndexationChart pages={pages} />
    </section>
  );
});
