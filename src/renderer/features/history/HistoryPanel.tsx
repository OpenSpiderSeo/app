import { memo, useCallback, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyStateArt } from '../../assets/brand/EmptyStateArt';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import { QueryKey } from '../../lib/query-keys.const';
import { normalizeCrawlState } from '../../../shared/utils/crawl-state.utils';
import type { SeoReport } from '../../../shared/types/report.types';
import { buildSeoAuditMetrics } from '../../../shared/utils/seo-audit.utils';
import { useProject } from '../projects/ProjectProvider';
import {
  useCrawlIssues,
  useCrawlPageCount,
  useCrawlPages,
  useCrawlProgress,
} from '../crawl/use-crawl-queries';

interface HistoryPanelProps {
  onNavigate: (section: NavSectionName) => void;
  onOpenReport: (report: SeoReport) => void;
}

const LIVE_STATUSES = new Set(['running', 'pausing', 'paused', 'stopping']);

export const HistoryPanel = memo(function HistoryPanel({
  onNavigate,
  onOpenReport,
}: HistoryPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { active } = useProject();
  const [message, setMessage] = useState<string | null>(null);

  const { data: items = [], isFetching } = useQuery({
    queryKey: QueryKey.HistoryList(active?.id ?? 'none'),
    queryFn: () => window.openspider.listHistory(),
    enabled: Boolean(active?.id),
  });

  const { data: progress } = useCrawlProgress();
  const { data: pageCount = 0 } = useCrawlPageCount();
  const { data: pages = [] } = useCrawlPages();
  const { data: issues = [] } = useCrawlIssues();

  const liveActive = LIVE_STATUSES.has(progress?.status ?? 'idle');
  const liveErrors = useMemo(
    () => issues.filter((i) => i.severity === 'error').length,
    [issues],
  );
  const liveHealth = useMemo(() => {
    if (!liveActive || pages.length === 0) return null;
    return buildSeoAuditMetrics(pages, issues).healthScore;
  }, [issues, liveActive, pages]);
  const statusKey = `crawl.status.${progress?.status ?? 'idle'}` as MessageKey;

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['history'] });
  }, [queryClient]);

  const empty = items.length === 0 && !liveActive;

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <header className="hub-panel__toolbar">
        <p className="hub-panel__lead">{t('history.subtitle')}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onPress={refresh} isDisabled={isFetching}>
            {t('history.refresh')}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onPress={async () => {
              const result = await window.openspider.saveCurrentToHistory();
              if ('error' in result) setMessage(result.error);
              else {
                setMessage(t('history.saved'));
                refresh();
              }
            }}
          >
            {t('history.saveCurrent')}
          </Button>
        </div>
      </header>

      {message ? (
        <div className="border border-[var(--os-line)] bg-[var(--os-panel)] px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}

      {empty ? (
        <div className="admin-panel os-empty-state flex-1 p-8">
          <EmptyStateArt kind="scroll" size={130} className="os-empty-state__art" />
          <p className="os-empty-state__text">{t('history.empty')}</p>
        </div>
      ) : (
        <div className="admin-panel min-h-0 flex-1 overflow-auto">
          <table className="os-table w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-[var(--os-panel-2)] text-[11px] uppercase tracking-wide text-[var(--os-faint)]">
              <tr>
                <th className="border-b border-[var(--os-line)] px-3 py-2" title={t('history.col.statusHint')}>
                  {t('history.col.status')}
                </th>
                <th className="border-b border-[var(--os-line)] px-3 py-2">{t('history.col.date')}</th>
                <th className="border-b border-[var(--os-line)] px-3 py-2">{t('history.col.url')}</th>
                <th className="border-b border-[var(--os-line)] px-3 py-2" title={t('history.col.pagesHint')}>
                  {t('history.col.pages')}
                </th>
                <th className="border-b border-[var(--os-line)] px-3 py-2" title={t('history.col.errorsHint')}>
                  {t('history.col.errors')}
                </th>
                <th className="border-b border-[var(--os-line)] px-3 py-2" title={t('history.col.healthHint')}>
                  {t('history.col.health')}
                </th>
                <th className="border-b border-[var(--os-line)] px-3 py-2">{t('history.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {liveActive ? (
                <tr className="border-b border-[var(--os-line-strong)] bg-[var(--os-panel-2)]">
                  <td className="px-3 py-2">
                    <span className="border border-[var(--os-line-strong)] px-1.5 py-0.5 font-mono text-[10px] uppercase">
                      {t(statusKey)}
                    </span>
                  </td>
                  <td className="os-table-num px-3 py-2 text-xs tabular-nums">
                    {(progress?.startedAt ?? new Date().toISOString())
                      .replace('T', ' ')
                      .slice(0, 19)}
                  </td>
                  <td className="px-3 py-2 min-w-0">
                    {progress?.startUrl ? (
                      <AnalyzeUrl
                        url={progress.startUrl}
                        compact
                        preferPage={false}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      t('history.currentUntitled')
                    )}
                  </td>
                  <td className="os-table-num px-3 py-2 tabular-nums">{pageCount}</td>
                  <td className="os-table-num px-3 py-2 tabular-nums">{liveErrors}</td>
                  <td className="os-table-num px-3 py-2 tabular-nums">{liveHealth ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={() => onNavigate(NavSection.Issues)}
                      >
                        {t('history.open')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => onNavigate(NavSection.Crawl)}
                      >
                        {t('history.openCrawl')}
                      </Button>
                      {progress?.status === 'paused' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={async () => {
                            await window.openspider.resumeCrawl();
                          }}
                        >
                          {t('crawl.resume')}
                        </Button>
                      ) : null}
                      {progress?.status === 'running' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={async () => {
                            await window.openspider.pauseCrawl();
                          }}
                        >
                          {t('crawl.pause')}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : null}

              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--os-line)] hover:bg-[var(--os-hover)]">
                  <td className="px-3 py-2">
                    <span className="os-badge font-mono uppercase">
                      {t('history.status.saved')}
                    </span>
                  </td>
                  <td className="os-table-num px-3 py-2 text-xs tabular-nums">
                    {item.createdAt.replace('T', ' ').slice(0, 19)}
                  </td>
                  <td className="px-3 py-2 min-w-0">
                    {item.startUrl || item.title ? (
                      <AnalyzeUrl
                        url={item.startUrl || item.title}
                        compact
                        preferPage={false}
                        onNavigate={onNavigate}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="os-table-num px-3 py-2 tabular-nums">{item.pages}</td>
                  <td className="os-table-num px-3 py-2 tabular-nums">{item.errors}</td>
                  <td className="os-table-num px-3 py-2 tabular-nums">
                    {item.healthScore === null || item.healthScore === undefined
                      ? '—'
                      : item.healthScore}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={async () => {
                          const report = await window.openspider.loadHistory(item.id);
                          if (!report) return;
                          onOpenReport(report);
                          queryClient.setQueryData(QueryKey.CrawlProgress, normalizeCrawlState(report.state).progress);
                          queryClient.setQueryData(QueryKey.CrawlPages, normalizeCrawlState(report.state).pages);
                          queryClient.setQueryData(QueryKey.CrawlIssues, normalizeCrawlState(report.state).issues);
                          onNavigate(NavSection.Issues);
                        }}
                      >
                        {t('history.open')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={async () => {
                          await window.openspider.deleteHistory(item.id);
                          refresh();
                        }}
                      >
                        {t('history.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});
