/**
 * Глобальный индикатор активного обхода — виден на любой вкладке.
 */
import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import { useCrawlActions, useCrawlMeta, useCrawlProgress } from '../crawl/use-crawl-queries';
import type { CrawlStatusName } from '../../../shared/types/crawl.types';
import { crawlProgressPct } from '../../../shared/utils/crawl-progress.utils';
import { crawlProgressLabel } from '../../../shared/utils/crawl-live-stats.utils';
import { CrawlLiveStats } from '../crawl/CrawlLiveStats';

const ACTIVE: ReadonlySet<CrawlStatusName> = new Set([
  'running',
  'pausing',
  'paused',
  'stopping',
]);

interface CrawlStatusBarProps {
  onNavigate?: (section: NavSectionName) => void;
  compact?: boolean;
  /** Hide when already on Crawl workspace (toolbar is enough). */
  hideOnCrawl?: boolean;
  activeSection?: NavSectionName;
}

export const CrawlStatusBar = memo(function CrawlStatusBar({
  onNavigate,
  compact = false,
  hideOnCrawl = false,
  activeSection,
}: CrawlStatusBarProps) {
  const { t } = useI18n();
  const { data: progress } = useCrawlProgress();
  const { data: meta } = useCrawlMeta();
  const { pause, resume, stop } = useCrawlActions();

  const status = progress?.status ?? 'idle';
  const busy = Boolean(meta?.busy);
  const crawlActive = ACTIVE.has(status) || busy;
  if (!crawlActive) return null;
  if (hideOnCrawl && activeSection === NavSection.Crawl && !compact) {
    return null;
  }

  const statusKey = `crawl.status.${status}` as MessageKey;
  const pct = progress ? crawlProgressPct(progress) : null;
  const paused = status === 'paused';
  const running = status === 'running' || status === 'pausing' || busy;

  const goTarget = () => onNavigate?.(NavSection.Crawl);

  if (compact) {
    return (
      <button
        type="button"
        className="crawl-status crawl-status--compact"
        onClick={goTarget}
        data-testid="crawl-status-compact"
      >
        <span className={`crawl-status__dot crawl-status__dot--${status}`} />
        <span className="crawl-status__label">{t(statusKey)}</span>
        <span className="crawl-status__nums font-mono">
          {progress
            ? compactCrawlNums(progress)
            : pct != null
              ? `${pct}%`
              : '…'}
        </span>
      </button>
    );
  }

  return (
    <div className="crawl-status" data-testid="crawl-status-bar" role="status">
      <button type="button" className="crawl-status__main" onClick={goTarget}>
        <span className={`crawl-status__dot crawl-status__dot--${status}`} />
        <div className="crawl-status__text">
          <div className="crawl-status__title">
            {t('crawl.hud.title')} · {t(statusKey)}
          </div>
          <CrawlLiveStats progress={progress ?? emptyProgressFallback(status)} compact />
        </div>
        <div className="crawl-status__pct font-mono">
          {crawlProgressLabel(progress ?? emptyProgressFallback(status)) ||
            (pct == null ? t('crawl.stats.indeterminate') : '')}
        </div>
      </button>

      <div className="crawl-status__track" aria-hidden>
        <div
          className={`crawl-status__fill ${pct == null ? 'crawl-status__fill--pulse' : ''}`}
          style={pct != null ? { width: `${Math.max(2, pct)}%` } : undefined}
          title={pct != null ? `${pct}%` : t('crawl.stats.indeterminate')}
        />
      </div>

      <div className="crawl-status__actions">
        {paused ? (
          <button
            type="button"
            className="os-btn os-btn--primary crawl-status__btn"
            disabled={resume.isPending}
            onClick={() => resume.mutate()}
          >
            {t('crawl.resume')}
          </button>
        ) : (
          <button
            type="button"
            className="os-btn os-btn--ghost crawl-status__btn"
            disabled={!running || pause.isPending}
            onClick={() => pause.mutate()}
          >
            {t('crawl.pause')}
          </button>
        )}
        <button
          type="button"
          className="os-btn os-btn--ghost crawl-status__btn"
          disabled={!running && !paused}
          onClick={() => stop.mutate()}
        >
          {t('crawl.stop')}
        </button>
        <button type="button" className="os-btn os-btn--ghost crawl-status__btn" onClick={goTarget}>
          {t('crawl.hud.open')}
        </button>
      </div>
    </div>
  );
});

function emptyProgressFallback(status: CrawlStatusName) {
  return {
    status,
    fetched: 0,
    queued: 0,
    active: 0,
    errors: 0,
    startedAt: null,
    finishedAt: null,
    startUrl: null,
  };
}

function compactCrawlNums(progress: {
  fetched: number;
  queued: number;
  active?: number;
}): string {
  const active = progress.active ?? 0;
  const pending = progress.queued + active;
  if (pending > 0) return `${progress.fetched}/+${pending}`;
  return String(progress.fetched);
}
