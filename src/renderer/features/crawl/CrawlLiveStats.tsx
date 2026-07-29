import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import type { CrawlProgress } from '../../../shared/types/crawl.types';
import {
  crawlIssueCount,
  crawlLimitLabel,
  crawlProgressLabel,
  formatCrawlFetchStats,
} from '../../../shared/utils/crawl-live-stats.utils';

interface CrawlLiveStatsProps {
  progress: CrawlProgress;
  /** Hide status pill (status bar title already shows it). */
  compact?: boolean;
  /** Show start URL on its own line (avoids truncating counters). */
  showUrl?: boolean;
  className?: string;
}

/** Shared live crawl counters — status, fetch queue, limits, issues, progress %. */
export const CrawlLiveStats = memo(function CrawlLiveStats({
  progress,
  compact = false,
  showUrl = true,
  className = '',
}: CrawlLiveStatsProps) {
  const { t } = useI18n();
  const { status, startUrl } = progress;
  const statusKey = `crawl.status.${status}` as MessageKey;
  const limits = crawlLimitLabel(progress);
  const issues = crawlIssueCount(progress);
  const pctLabel = crawlProgressLabel(progress);
  const fetchLine = formatCrawlFetchStats(progress, {
    fetched: t('crawl.stats.fetched'),
    queue: t('crawl.stats.queue'),
    active: t('crawl.stats.active'),
    errors: t('crawl.stats.errors'),
  });

  return (
    <div className={`crawl-live-stats ${className}`.trim()}>
      <div className="crawl-live-stats__row">
        {!compact ? (
          <span className="crawl-live-stats__status border border-[var(--os-line-strong)] px-2 py-0.5 font-mono text-[11px] uppercase">
            {t(statusKey)}
          </span>
        ) : null}
        <span className="crawl-live-stats__nums font-mono text-xs">{fetchLine}</span>
        {limits ? (
          <span className="crawl-live-stats__limits font-mono text-xs opacity-80">{limits}</span>
        ) : null}
        {issues > 0 ? (
          <span className="crawl-live-stats__issues font-mono text-xs">
            {t('crawl.stats.issues', { count: issues })}
          </span>
        ) : null}
        {!compact && pctLabel ? (
          <span className="crawl-live-stats__pct font-mono text-xs font-semibold text-[var(--os-accent)]">
            {pctLabel}
          </span>
        ) : null}
      </div>
      {showUrl && startUrl ? (
        <div className="crawl-live-stats__url font-mono text-xs opacity-80" title={startUrl}>
          {startUrl}
        </div>
      ) : null}
    </div>
  );
});
