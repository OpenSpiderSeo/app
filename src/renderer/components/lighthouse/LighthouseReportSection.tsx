import { memo, useMemo } from 'react';
import type { LighthouseAuditItem, LighthouseScores } from '../../../shared/types/audit.types';
import { useI18n } from '../../i18n/I18nProvider';

function AuditList({
  title,
  items,
}: {
  title: string;
  items: LighthouseAuditItem[];
}) {
  if (items.length === 0) return null;
  return (
    <div className="lh-report__group">
      <h4 className="admin-label">{title}</h4>
      <ul className="lh-report__list">
        {items.map((a) => (
          <li key={a.id} className={`lh-report__item lh-report__item--${a.kind}`}>
            <div className="lh-report__item-head">
              <span className="lh-report__item-title">{a.title}</span>
              {a.displayValue ? (
                <span className="lh-report__item-value">{a.displayValue}</span>
              ) : a.score != null ? (
                <span className="lh-report__item-value">{a.score}</span>
              ) : null}
            </div>
            {a.description ? (
              <p className="lh-report__item-desc">{a.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const LighthouseReportSection = memo(function LighthouseReportSection({
  scores,
}: {
  scores: LighthouseScores;
}) {
  const { t } = useI18n();
  const { failed, opportunities } = useMemo(() => {
    const audits = scores.audits ?? [];
    return {
      failed: audits.filter((a) => a.kind === 'failed'),
      opportunities: audits.filter((a) => a.kind === 'opportunity'),
    };
  }, [scores.audits]);

  const hasAudits = failed.length > 0 || opportunities.length > 0;
  const emptyKey =
    scores.source === 'local-lab' ? 'lighthouse.report.localEmpty' : 'lighthouse.report.empty';

  return (
    <details className="lh-report admin-panel p-4" open={hasAudits}>
      <summary className="lh-report__summary">
        <span className="font-display text-base font-medium">{t('lighthouse.report.title')}</span>
        {hasAudits ? (
          <span className="lh-report__badge">
            {t('lighthouse.report.count', { count: failed.length + opportunities.length })}
          </span>
        ) : null}
      </summary>
      <p className="mt-2 text-xs text-[var(--os-muted)]">{t('lighthouse.report.hint')}</p>

      {hasAudits ? (
        <div className="mt-4 space-y-4">
          <AuditList title={t('lighthouse.report.failed')} items={failed} />
          <AuditList title={t('lighthouse.report.opportunities')} items={opportunities} />
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--os-muted)]">{t(emptyKey)}</p>
      )}
    </details>
  );
});
