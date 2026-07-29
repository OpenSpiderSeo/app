import { memo, useEffect, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import type { ScheduleConfig } from '../../../shared/types/ipc.types';
import { useI18n } from '../../i18n/I18nProvider';

export const SchedulePanel = memo(function SchedulePanel() {
  const { t } = useI18n();
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false,
    cronLike: 'daily',
    url: '',
    keyword: '',
    lastRunAt: null,
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void window.openspider.getSchedule().then(setSchedule);
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await window.openspider.saveSchedule(schedule);
      setMsg(t('schedule.saved'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const field =
    'mt-1 w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2 py-1.5 text-sm';

  return (
    <article className="admin-panel grid gap-3 p-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <h2 className="font-display text-base font-semibold">{t('schedule.title')}</h2>
        <p className="mt-1 text-sm text-[var(--os-muted)]">{t('schedule.subtitle')}</p>
      </div>

      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={schedule.enabled}
          onChange={(e) => setSchedule((s) => ({ ...s, enabled: e.target.checked }))}
        />
        {t('schedule.enabled')}
      </label>

      <label className="text-sm">
        <span className="admin-label">{t('schedule.frequency')}</span>
        <select
          className={field}
          value={schedule.cronLike}
          onChange={(e) =>
            setSchedule((s) => ({
              ...s,
              cronLike: e.target.value as ScheduleConfig['cronLike'],
            }))
          }
        >
          <option value="hourly">{t('schedule.hourly')}</option>
          <option value="daily">{t('schedule.daily')}</option>
        </select>
      </label>

      <TextField
        className="text-sm"
        value={schedule.url}
        onChange={(v) => setSchedule((s) => ({ ...s, url: v }))}
      >
        <Label>{t('schedule.url')}</Label>
        <Input placeholder={t('crawl.placeholder')} />
      </TextField>

      <TextField
        className="text-sm md:col-span-2"
        value={schedule.keyword}
        onChange={(v) => setSchedule((s) => ({ ...s, keyword: v }))}
      >
        <Label>{t('schedule.keyword')}</Label>
        <Input placeholder={t('schedule.keywordHint')} />
      </TextField>

      {schedule.lastRunAt ? (
        <p className="text-xs text-[var(--os-muted)] md:col-span-2">
          {t('schedule.lastRun', { at: new Date(schedule.lastRunAt).toLocaleString() })}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <Button variant="primary" isDisabled={busy} onPress={() => void save()}>
          {t('schedule.save')}
        </Button>
        {msg ? <span className="text-sm text-[var(--os-muted)]">{msg}</span> : null}
      </div>
    </article>
  );
});
