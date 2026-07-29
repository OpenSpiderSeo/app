import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSystemLoad } from './SystemLoadProvider';

function formatGib(bytes: number): string {
  const gib = bytes / (1024 ** 3);
  return gib >= 10 ? gib.toFixed(0) : gib.toFixed(1);
}

function loadTone(percent: number): 'ok' | 'warn' | 'hot' {
  if (percent >= 85) return 'hot';
  if (percent >= 65) return 'warn';
  return 'ok';
}

/** Compact CPU/RAM for the sidebar footer. */
export const SystemLoadInline = memo(function SystemLoadInline({
  quiet = false,
}: {
  quiet?: boolean;
}) {
  const { t } = useI18n();
  const load = useSystemLoad();

  if (!load) {
    if (quiet) return null;
    return (
      <div className="system-load-inline" aria-label={t('systemLoad.label')}>
        <span className="system-load-inline__muted">CPU · RAM</span>
      </div>
    );
  }

  const cpuTone = loadTone(load.cpuPercent);
  const ramTone = loadTone(load.ramPercent);
  const elevated = cpuTone !== 'ok' || ramTone !== 'ok';

  // Quiet mode: hide when idle; only surface when load is elevated.
  if (quiet && !elevated) return null;

  return (
    <div
      className={`system-load-inline${quiet ? ' system-load-inline--quiet' : ''}`}
      aria-live="polite"
      aria-label={t('systemLoad.label')}
    >
      <span className={`system-load-inline__item is-${cpuTone}`}>
        <span className="system-load-inline__key">CPU</span>
        <span className="system-load-inline__val">{load.cpuPercent.toFixed(0)}%</span>
      </span>
      <span className="system-load-inline__sep" aria-hidden>
        ·
      </span>
      <span className={`system-load-inline__item is-${ramTone}`}>
        <span className="system-load-inline__key">RAM</span>
        <span className="system-load-inline__val">
          {load.ramPercent.toFixed(0)}%
          {!quiet ? (
            <span className="system-load-inline__detail">
              {formatGib(load.ramUsedBytes)}/{formatGib(load.ramTotalBytes)}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );
});

/** Floating corner HUD (optional / legacy). */
export const SystemLoadHud = memo(function SystemLoadHud() {
  const { t } = useI18n();
  const load = useSystemLoad();

  if (!load) return null;

  const cpuTone = loadTone(load.cpuPercent);
  const ramTone = loadTone(load.ramPercent);

  return (
    <aside className="system-load-hud" aria-live="polite" aria-label={t('systemLoad.label')}>
      <div className={`system-load-hud__metric is-${cpuTone}`}>
        <span className="system-load-hud__key">CPU</span>
        <span className="system-load-hud__val">{load.cpuPercent.toFixed(0)}%</span>
        <span className="system-load-hud__bar" style={{ width: `${Math.min(100, load.cpuPercent)}%` }} />
      </div>
      <div className={`system-load-hud__metric is-${ramTone}`}>
        <span className="system-load-hud__key">RAM</span>
        <span className="system-load-hud__val">
          {load.ramPercent.toFixed(0)}%
          <span className="system-load-hud__detail">
            {formatGib(load.ramUsedBytes)}/{formatGib(load.ramTotalBytes)} {t('systemLoad.gib')}
          </span>
        </span>
        <span className="system-load-hud__bar" style={{ width: `${Math.min(100, load.ramPercent)}%` }} />
      </div>
    </aside>
  );
});
