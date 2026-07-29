/**
 * Навигация: 6 hub'ов. NavSection id сохранены для sessionStorage / onNavigate.
 */
export const NavSection = {
  Dashboard: 'dashboard',
  History: 'history',
  Crawl: 'crawl',
  Issues: 'issues',
  Googlebot: 'googlebot',
  Reports: 'reports',
  Visualization: 'visualization',
  Guide: 'guide',
  Metrics: 'metrics',
  Labs: 'labs',
  Integrations: 'integrations',
  Memory: 'memory',
  Settings: 'settings',
} as const;

export type NavSectionName = (typeof NavSection)[keyof typeof NavSection];

export const NavHub = {
  Command: 'command',
  Scout: 'scout',
  Issues: 'issues-hub',
  Chronicles: 'chronicles',
  Forge: 'forge',
  Settings: 'settings',
} as const;

export type NavHubId = (typeof NavHub)[keyof typeof NavHub];

export const HUB_SECTIONS: Record<NavHubId, readonly NavSectionName[]> = {
  [NavHub.Command]: [NavSection.Dashboard],
  [NavHub.Scout]: [NavSection.Crawl, NavSection.Visualization],
  [NavHub.Issues]: [NavSection.Issues],
  [NavHub.Chronicles]: [NavSection.History, NavSection.Reports],
  [NavHub.Forge]: [NavSection.Metrics],
  [NavHub.Settings]: [NavSection.Settings, NavSection.Integrations, NavSection.Memory, NavSection.Guide],
};

export const HUB_DEFAULT: Record<NavHubId, NavSectionName> = {
  [NavHub.Command]: NavSection.Dashboard,
  [NavHub.Scout]: NavSection.Crawl,
  [NavHub.Issues]: NavSection.Issues,
  [NavHub.Chronicles]: NavSection.History,
  [NavHub.Forge]: NavSection.Metrics,
  [NavHub.Settings]: NavSection.Settings,
};

export const HUB_ORDER: readonly NavHubId[] = [
  NavHub.Command,
  NavHub.Scout,
  NavHub.Issues,
  NavHub.Chronicles,
  NavHub.Forge,
  NavHub.Settings,
];

export function hubForSection(section: NavSectionName): NavHubId {
  if (
    section === NavSection.Metrics ||
    section === NavSection.Labs ||
    section === NavSection.Googlebot
  ) {
    return NavHub.Forge;
  }
  for (const hub of HUB_ORDER) {
    if (HUB_SECTIONS[hub].includes(section)) return hub;
  }
  return NavHub.Scout;
}

/** Map removed section ids (e.g. quickstart) to current nav targets. */
export function normalizeNavSection(id: string): NavSectionName {
  if (id === 'quickstart' || id === 'labs' || id === 'googlebot') return NavSection.Metrics;
  const known = Object.values(NavSection) as NavSectionName[];
  if (known.includes(id as NavSectionName)) return id as NavSectionName;
  return NavSection.Dashboard;
}

export const NavGroup = {
  Work: 'work',
  Analyze: 'analyze',
  Library: 'library',
} as const;

export type NavGroupName = (typeof NavGroup)[keyof typeof NavGroup];
