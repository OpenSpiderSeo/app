import type { ReactNode } from 'react';
import { HUB_SECTIONS, type NavHubId, type NavSectionName } from '../../app/routes.const';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';

const SECTION_LABEL: Record<NavSectionName, MessageKey> = {
  dashboard: 'nav.dashboard',
  history: 'nav.history',
  crawl: 'nav.crawl',
  issues: 'nav.issues',
  googlebot: 'nav.googlebot',
  reports: 'nav.reports',
  visualization: 'nav.visualization',
  guide: 'nav.guide',
  metrics: 'nav.metrics',
  labs: 'nav.labs',
  integrations: 'nav.integrations',
  memory: 'nav.memory',
  settings: 'nav.settings',
};

const HUB_LABEL: Record<NavHubId, MessageKey> = {
  command: 'nav.hub.command',
  scout: 'nav.hub.scout',
  'issues-hub': 'nav.hub.issues',
  chronicles: 'nav.hub.chronicles',
  forge: 'nav.hub.forge',
  settings: 'nav.hub.settings',
};

interface HubShellProps {
  hub: NavHubId;
  active: NavSectionName;
  onChange: (id: NavSectionName) => void;
  children: ReactNode;
}

export function HubShell({ hub, active, onChange, children }: HubShellProps) {
  const { t } = useI18n();
  const tabs = HUB_SECTIONS[hub];
  const showTabs = tabs.length > 1;

  return (
    <div className={`hub-shell${showTabs ? '' : ' hub-shell--solo'}`}>
      {showTabs ? (
        <header className="hub-shell__chrome">
          <p className="admin-label">{t(HUB_LABEL[hub])}</p>
          <div className="hub-shell__head-row">
            <h1 className="hub-shell__title">{t(SECTION_LABEL[active])}</h1>
            <div className="hub-shell__tabs" role="tablist" aria-label={t(HUB_LABEL[hub])}>
              {tabs.map((id) => {
                const isActive = id === active;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    data-testid={`hub-tab-${id}`}
                    className={`hub-shell__tab ${isActive ? 'hub-shell__tab--active' : ''}`}
                    onClick={() => onChange(id)}
                  >
                    {t(SECTION_LABEL[id])}
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      ) : null}
      {/* Remount on section change so enter motion plays on every screen */}
      <div className="hub-shell__body os-page-enter" role="tabpanel" key={active}>
        {children}
      </div>
    </div>
  );
}
