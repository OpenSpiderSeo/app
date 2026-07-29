import { memo, useCallback, useEffect, useState } from 'react';
import { LanguageSwitcher } from '../shell/LanguageSwitcher';
import { SystemLoadInline } from '../shell/SystemLoadHud';
import { useI18n } from '../../i18n/I18nProvider';
import { useAppInfoQuery } from '../crawl/use-crawl-queries';
import { APP_NAME, APP_VERSION } from '../../../shared/const/app.const';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import type { AppUpdateStatus } from '../../../shared/types/ipc.types';
import type { MessageKey } from '../../i18n/translate';

interface SettingsPanelProps {
  onNavigate?: (section: NavSectionName) => void;
}

function updateStatusLabel(
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  status: AppUpdateStatus,
): string {
  switch (status.phase) {
    case 'checking':
      return t('settings.update.checking');
    case 'available':
      return t('settings.update.available', { version: status.version ?? '?' });
    case 'not-available':
      return t('settings.update.notAvailable');
    case 'downloading':
      return t('settings.update.downloading', { progress: status.progress ?? 0 });
    case 'downloaded':
      return t('settings.update.downloaded', { version: status.version ?? '?' });
    case 'error':
      return status.message ?? t('settings.update.error');
    default:
      return t('settings.update.idle');
  }
}

export const SettingsPanel = memo(function SettingsPanel({ onNavigate }: SettingsPanelProps) {
  const { t } = useI18n();
  const { data: appInfo } = useAppInfoQuery();
  const version = appInfo?.version ?? APP_VERSION;
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus>({ phase: 'idle' });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    void window.openspider.getUpdateStatus().then(setUpdateStatus);
    return window.openspider.onUpdateStatus(setUpdateStatus);
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const status = await window.openspider.checkForUpdates();
      setUpdateStatus(status);
    } finally {
      setChecking(false);
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    await window.openspider.installUpdate();
  }, []);

  return (
    <section className="os-page settings-panel">
      <p className="hub-panel__lead">{t('settings.subtitle')}</p>

      <div className="settings-panel__grid">
        <article className="admin-panel settings-panel__card">
          <h2 className="settings-panel__card-title">{t('settings.language')}</h2>
          <p className="settings-panel__card-hint">{t('settings.languageHint')}</p>
          <div className="settings-panel__control">
            <LanguageSwitcher />
          </div>
        </article>

        <article className="admin-panel settings-panel__card">
          <h2 className="settings-panel__card-title">{t('settings.app')}</h2>
          <p className="settings-panel__card-hint">{t('settings.appHint')}</p>
          <dl className="settings-panel__meta">
            <div>
              <dt>{t('settings.appName')}</dt>
              <dd>{APP_NAME}</dd>
            </div>
            <div>
              <dt>{t('settings.version')}</dt>
              <dd className="font-mono">{version}</dd>
            </div>
            <div>
              <dt>{t('settings.load')}</dt>
              <dd>
                <SystemLoadInline />
              </dd>
            </div>
          </dl>
        </article>

        {appInfo?.updatesSupported ? (
          <article className="admin-panel settings-panel__card">
            <h2 className="settings-panel__card-title">{t('settings.update.title')}</h2>
            <p className="settings-panel__card-hint">{t('settings.update.hint')}</p>
            <p className="settings-panel__card-hint">{updateStatusLabel(t, updateStatus)}</p>
            <div className="settings-panel__links">
              <button
                type="button"
                className="os-btn os-btn--ghost"
                disabled={checking || updateStatus.phase === 'checking' || updateStatus.phase === 'downloading'}
                onClick={() => void handleCheckUpdates()}
              >
                {t('settings.update.check')}
              </button>
              {updateStatus.phase === 'downloaded' ? (
                <button type="button" className="os-btn os-btn--primary" onClick={() => void handleInstallUpdate()}>
                  {t('settings.update.install')}
                </button>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="admin-panel settings-panel__card">
          <h2 className="settings-panel__card-title">{t('settings.related')}</h2>
          <p className="settings-panel__card-hint">{t('settings.relatedHint')}</p>
          <div className="settings-panel__links">
            <button
              type="button"
              className="os-btn os-btn--ghost"
              onClick={() => onNavigate?.(NavSection.Integrations)}
            >
              {t('nav.integrations')}
            </button>
            <button
              type="button"
              className="os-btn os-btn--ghost"
              onClick={() => onNavigate?.(NavSection.Memory)}
            >
              {t('nav.memory')}
            </button>
            <button
              type="button"
              className="os-btn os-btn--ghost"
              onClick={() => onNavigate?.(NavSection.Guide)}
            >
              {t('nav.guide')}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
});
