import { useState } from 'react';
import { NavSection, hubForSection, normalizeNavSection, type NavSectionName } from './routes.const';
import { Sidebar } from '../features/shell/Sidebar';
import { HubShell } from '../features/shell/HubShell';
import { DashboardPanel } from '../features/dashboard/DashboardPanel';
import { CrawlWorkspace } from '../features/crawl/CrawlWorkspace';
import { IssuesPanel } from '../features/issues/IssuesPanel';
import { HistoryPanel } from '../features/history/HistoryPanel';
import { ReportsPanel } from '../features/reports/ReportsPanel';
import { VisualizationPanel } from '../features/visualization/VisualizationPanel';
import { GuidePanel } from '../features/guide/GuidePanel';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { AnalysisPanel } from '../features/analysis/AnalysisPanel';
import { IntegrationsPanel } from '../features/integrations/IntegrationsPanel';
import { MemoryPanel } from '../features/projects/MemoryPanel';
import { ProjectsHome } from '../features/projects/ProjectsHome';
import { useProject } from '../features/projects/ProjectProvider';
import { CrawlQuerySync } from '../features/crawl/CrawlQuerySync';
import { useAppInfoQuery } from '../features/crawl/use-crawl-queries';
import { AppErrorBoundary } from '../components/AppErrorBoundary';
import { EchoAtmosphere } from '../components/EchoAtmosphere';
import { SpiderMark } from '../assets/brand/SpiderMark';
import { SystemLoadHud } from '../features/shell/SystemLoadHud';
import { CrawlStatusBar } from '../features/shell/CrawlStatusBar';
import { APP_VERSION } from '../../shared/const/app.const';
import type { SeoReport } from '../../shared/types/report.types';

export function App() {
  const [section, setSection] = useState<NavSectionName>(NavSection.Dashboard);
  const [, setActiveReport] = useState<SeoReport | null>(null);
  const { data: appInfo } = useAppInfoQuery();
  const version = appInfo?.version ?? APP_VERSION;
  const { active, isLoading } = useProject();

  if (isLoading) {
    return (
      <div className="os-boot">
        <EchoAtmosphere dense />
        <div className="os-boot__inner">
          <SpiderMark size={56} className="os-boot__mon" />
          <div className="os-boot__mark">OpenSpider</div>
          <div className="os-boot__pulse" />
        </div>
        <SystemLoadHud />
      </div>
    );
  }

  if (!active) {
    return (
      <>
        <ProjectsHome />
        <SystemLoadHud />
      </>
    );
  }

  const hub = hubForSection(section);
  const navigate = (id: NavSectionName | string) => setSection(normalizeNavSection(id));

  return (
    <AppErrorBoundary>
      <div className="os-shell">
        <EchoAtmosphere />
        <CrawlQuerySync />
        <Sidebar
        active={section}
        onChange={navigate}
        version={version}
        projectName={active.name}
        projectDomain={active.domain}
        healthScore={active.lastHealthScore}
      />
      <main className="os-shell__main">
        <div className="os-shell__stack">
          <CrawlStatusBar onNavigate={navigate} hideOnCrawl activeSection={section} />
          <HubShell hub={hub} active={section} onChange={navigate}>
          {section === NavSection.Dashboard ? (
            <DashboardPanel onNavigate={navigate} />
          ) : null}
          {section === NavSection.Crawl ? (
            <CrawlWorkspace onNavigate={navigate} />
          ) : null}
          {section === NavSection.Issues ? <IssuesPanel onNavigate={navigate} /> : null}
          {section === NavSection.History ? (
            <HistoryPanel onNavigate={navigate} onOpenReport={setActiveReport} />
          ) : null}
          {section === NavSection.Reports ? <ReportsPanel onNavigate={navigate} /> : null}
          {section === NavSection.Visualization ? (
            <VisualizationPanel onNavigate={navigate} />
          ) : null}
          {section === NavSection.Guide ? <GuidePanel /> : null}
          {section === NavSection.Settings ? (
            <SettingsPanel onNavigate={navigate} />
          ) : null}
          {section === NavSection.Metrics ? (
            <AnalysisPanel onNavigate={navigate} />
          ) : null}
          {section === NavSection.Integrations ? <IntegrationsPanel /> : null}
          {section === NavSection.Memory ? <MemoryPanel /> : null}
          </HubShell>
        </div>
      </main>
    </div>
    </AppErrorBoundary>
  );
}
