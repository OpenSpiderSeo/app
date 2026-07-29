import { memo, useEffect, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../i18n/I18nProvider';
import type { SeoReport } from '../../../shared/types/report.types';
import { QueryKey } from '../../lib/query-keys.const';
import { useProject } from '../projects/ProjectProvider';
import { UnifiedReportView } from './UnifiedReportView';

export const ReportsPanel = memo(function ReportsPanel({
  onNavigate,
}: {
  onNavigate?: (section: import('../../app/routes.const').NavSectionName) => void;
} = {}) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const { active } = useProject();
  const [viewId, setViewId] = useState<'current' | string>('current');
  const [snapshot, setSnapshot] = useState<SeoReport | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: QueryKey.HistoryList(active?.id ?? 'none'),
    queryFn: () => window.openspider.listHistory(),
    enabled: Boolean(active?.id),
  });

  const options = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        label: t('history.snapshotLabel', {
          date: i.createdAt.slice(0, 16),
          url: i.startUrl || i.title,
          pages: String(i.pages),
          audit: i.hasAudit ? t('history.snapshotAudit') : '',
        }),
      })),
    [items, t],
  );

  const exportId = viewId === 'current' ? undefined : viewId;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (viewId === 'current') {
        const report = await window.openspider.getCurrentReport();
        if (!cancelled) setSnapshot(report.summary.pages > 0 || report.audit ? report : null);
        return;
      }
      const report = await window.openspider.loadHistory(viewId);
      if (!cancelled) setSnapshot(report);
    })();
    return () => {
      cancelled = true;
    };
  }, [viewId, items.length]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-auto">
      <p className="hub-panel__lead max-w-2xl">{t('reports.subtitle')}</p>

      <div className="admin-panel flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[220px] flex-1 text-sm">
          <span className="admin-label">{t('reports.snapshot.pick')}</span>
          <select
            className="mt-1 w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2 py-2 text-sm"
            value={viewId}
            onChange={(e) => setViewId(e.target.value)}
          >
            <option value="current">{t('reports.snapshot.current')}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="primary"
          onPress={async () => {
            const result = await window.openspider.exportReportPdf({ id: exportId, locale });
            if ('error' in result) {
              if (result.error !== 'Cancelled') setMessage(result.error);
              return;
            }
            setMessage(t('reports.pdf.saved', { path: result.path }));
          }}
        >
          {t('reports.pdf.cta')}
        </Button>
        <Button
          variant="secondary"
          onPress={async () => {
            const result = await window.openspider.exportReport(exportId);
            if ('error' in result) setMessage(result.error);
            else setMessage(t('reports.saved', { path: result.path }));
          }}
        >
          {t('reports.export.cta')}
        </Button>
        <Button
          variant="secondary"
          onPress={async () => {
            const [pages, issues] = await Promise.all([
              window.openspider.exportCsvPages(),
              window.openspider.exportCsvIssues(),
            ]);
            if ('error' in pages) {
              setMessage(pages.error);
              return;
            }
            if ('error' in issues) {
              setMessage(issues.error);
              return;
            }
            setMessage(t('reports.csv.saved', { pages: pages.path, issues: issues.path }));
          }}
        >
          {t('reports.csv.cta')}
        </Button>
        <Button
          variant="secondary"
          onPress={async () => {
            const result = await window.openspider.importReport();
            if (!result.ok) {
              if (result.error !== 'Cancelled') setMessage(result.error);
              return;
            }
            setMessage(t('reports.imported'));
            void queryClient.invalidateQueries({ queryKey: ['history'] });
          }}
        >
          {t('reports.import.cta')}
        </Button>
      </div>

      {snapshot ? (
        <UnifiedReportView report={snapshot} onNavigate={onNavigate} />
      ) : (
        <div className="admin-panel p-6 text-sm text-[var(--os-muted)]">
          {t('reports.snapshot.empty')}
        </div>
      )}

      {message ? (
        <div className="border border-[var(--os-line)] bg-[var(--os-panel)] px-3 py-2 text-sm">
          {message}
        </div>
      ) : null}
    </section>
  );
});
