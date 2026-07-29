import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';

/** Schedule crawl — backend not ported; show honest unavailable state. */
export const SchedulePanel = memo(function SchedulePanel() {
  const { t } = useI18n();

  return (
    <article className="admin-panel grid gap-2 p-4">
      <h2 className="font-display text-base font-semibold">{t('schedule.title')}</h2>
      <p className="text-sm text-[var(--os-muted)]">{t('schedule.subtitle')}</p>
      <p className="text-sm text-[var(--os-muted)]">{t('feature.unavailable')}</p>
    </article>
  );
});
