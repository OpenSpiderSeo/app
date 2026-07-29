import { SystemLoadInline } from './SystemLoadHud';
import { CrawlStatusBar } from './CrawlStatusBar';
import {
  HUB_DEFAULT,
  HUB_ORDER,
  hubForSection,
  type NavHubId,
  type NavSectionName,
} from '../../app/routes.const';
import { SpiderMark } from '../../assets/brand/SpiderMark';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { healthBandFromScore } from '../../../shared/utils/honor-rank.utils';
import { useProject } from '../projects/ProjectProvider';

interface SidebarProps {
  active: NavSectionName;
  onChange: (id: NavSectionName) => void;
  version: string;
  projectName: string;
  projectDomain: string;
  healthScore?: number | null;
}

interface HubItem {
  id: NavHubId;
  labelKey: MessageKey;
}

const HUBS: HubItem[] = [
  { id: 'command', labelKey: 'nav.hub.command' },
  { id: 'scout', labelKey: 'nav.hub.scout' },
  { id: 'issues-hub', labelKey: 'nav.hub.issues' },
  { id: 'chronicles', labelKey: 'nav.hub.chronicles' },
  { id: 'forge', labelKey: 'nav.hub.forge' },
  { id: 'settings', labelKey: 'nav.hub.settings' },
];

function HubButton({
  item,
  activeHub,
  onSelect,
  t,
}: {
  item: HubItem;
  activeHub: NavHubId;
  onSelect: (hub: NavHubId) => void;
  t: (key: MessageKey) => string;
}) {
  const isActive = item.id === activeHub;
  return (
    <button
      type="button"
      data-testid={`nav-${item.id}`}
      onClick={() => onSelect(item.id)}
      className={`os-nav ${isActive ? 'os-nav--active' : ''}`}
    >
      <span className="os-nav__label">{t(item.labelKey)}</span>
    </button>
  );
}

export function Sidebar({
  active,
  onChange,
  version,
  projectName,
  projectDomain,
  healthScore = null,
}: SidebarProps) {
  const { t } = useI18n();
  const { selectProject } = useProject();
  const activeHub = hubForSection(active);
  const band = healthBandFromScore(healthScore);

  return (
    <aside className="os-sidebar">
      <div className="os-sidebar__brand" title={`OpenSpider v${version}`}>
        <div className="os-sidebar__logo-row">
          <SpiderMark size={22} className="os-sidebar__mon" />
          <div className="os-sidebar__logo">OpenSpider</div>
        </div>
      </div>

      <div className="os-sidebar__project">
        <div className="os-sidebar__project-name">{projectName}</div>
        <div className="os-sidebar__project-domain">{projectDomain}</div>
        {band ? (
          <div className={`os-sidebar__health os-sidebar__health--${band}`}>
            {t(`health.${band}` as MessageKey)}
          </div>
        ) : null}
        <button
          type="button"
          className="os-sidebar__back"
          onClick={() => void selectProject(null)}
        >
          ← {t('projects.back')}
        </button>
      </div>

      <nav className="os-sidebar__nav">
        <div className="os-sidebar__items">
          {HUB_ORDER.map((hubId) => {
            const item = HUBS.find((h) => h.id === hubId)!;
            return (
              <HubButton
                key={item.id}
                item={item}
                activeHub={activeHub}
                onSelect={(hub) => onChange(HUB_DEFAULT[hub])}
                t={t}
              />
            );
          })}
        </div>
      </nav>

      <div className="os-sidebar__foot">
        <CrawlStatusBar compact onNavigate={onChange} />
        <SystemLoadInline quiet />
      </div>
    </aside>
  );
}
