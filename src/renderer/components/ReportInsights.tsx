/** Shadow risk + post-report recommendations blocks (Labs, Metrics, Unified report). */
import { memo } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { MessageKey } from '../i18n/translate';
import type {
  ReportRecommendation,
  ShadowRiskAnalysis,
} from '../../shared/types/audit.types';
import { shadowBandTone } from '../../shared/utils/shadow-risk.utils';

export const ShadowRiskCard = memo(function ShadowRiskCard({
  analysis,
}: {
  analysis: ShadowRiskAnalysis;
}) {
  const { t } = useI18n();
  const tone = shadowBandTone(analysis.band);

  return (
    <article className="admin-panel p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-base font-semibold">{t('shadow.title')}</h3>
        <span
          className={`status-pill ${
            tone === 'ok' ? 'status-2xx' : tone === 'warn' ? 'status-4xx' : 'status-5xx'
          }`}
        >
          {t(`shadow.band.${analysis.band}` as MessageKey)}
        </span>
      </div>
      <p className="mt-2 text-sm text-[var(--os-muted)]">{t(`shadow.bandHint.${analysis.band}` as MessageKey)}</p>
      {analysis.signals.length > 0 ? (
        <>
          <h4 className="admin-label mt-4">{t('shadow.signalsTitle')}</h4>
          <ul className="mt-2 space-y-1 text-xs text-[var(--os-muted)]">
            {analysis.signals.map((s) => (
              <li key={s.id}>
                · {t(`shadow.signal.${s.id}` as MessageKey, s.params)}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-xs text-[var(--os-muted)]">{t('shadow.noSignals')}</p>
      )}
    </article>
  );
});

const priorityClass: Record<ReportRecommendation['priority'], string> = {
  high: 'status-5xx',
  medium: 'status-4xx',
  low: 'status-2xx',
};

export const ReportRecommendationsList = memo(function ReportRecommendationsList({
  items,
}: {
  items: ReportRecommendation[];
}) {
  const { t } = useI18n();

  if (items.length === 0) return null;

  const groups: ReportRecommendation['priority'][] = ['high', 'medium', 'low'];

  return (
    <article className="admin-panel p-4">
      <h3 className="font-display text-base font-semibold">{t('recommendations.title')}</h3>
      <p className="mt-1 text-sm text-[var(--os-muted)]">{t('recommendations.subtitle')}</p>
      <div className="mt-4 space-y-4">
        {groups.map((priority) => {
          const group = items.filter((r) => r.priority === priority);
          if (group.length === 0) return null;
          return (
            <div key={priority}>
              <h4 className="admin-label">{t(`recommendations.priority.${priority}` as MessageKey)}</h4>
              <ul className="mt-2 space-y-2">
                {group.map((r) => (
                  <li
                    key={r.id}
                    className="flex gap-2 border border-[var(--os-line)] bg-[var(--os-panel-2)] px-3 py-2 text-sm"
                  >
                    <span className={`status-pill shrink-0 self-start ${priorityClass[r.priority]}`}>
                      {t(`recommendations.priority.${r.priority}` as MessageKey)}
                    </span>
                    <span className="text-[var(--os-muted)]">
                      {t(`recommendations.item.${r.id}` as MessageKey, r.params)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
});
