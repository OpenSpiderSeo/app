import { memo, useState } from 'react';
import { CrawlToolbar } from './CrawlToolbar';
import { CrawlResultsTable } from './CrawlResultsTable';
import { CrawlConfigPanel, useCrawlConfigState } from './CrawlConfigPanel';
import { SchedulePanel } from './SchedulePanel';
import { SerpPreviewPanel } from '../serp-preview/SerpPreviewPanel';
import { useCrawlIssues, useCrawlMeta, useCrawlPages, useCrawlProgress } from './use-crawl-queries';
import { useI18n } from '../../i18n/I18nProvider';
import type { NavSectionName } from '../../app/routes.const';
import { requestGooglebotView } from '../googlebot/googlebot-nav';
import { openAnalysisSection, openIssuesFiltered } from '../../lib/analyze-nav';
import { SeoAuditSummary } from '../seo/SeoAuditSummary';
import { PanelTabs } from '../../components/PanelTabs';

type CrawlTabId = 'results' | 'config' | 'seo';

export const CrawlWorkspace = memo(function CrawlWorkspace({
  onNavigate,
}: {
  onNavigate?: (section: NavSectionName) => void;
}) {
  const { t } = useI18n();
  const { data: progress } = useCrawlProgress();
  const { data: meta } = useCrawlMeta();
  const { data: pages = [] } = useCrawlPages();
  const { data: issues = [] } = useCrawlIssues();
  const { config, setConfig } = useCrawlConfigState();
  const [tab, setTab] = useState<CrawlTabId>('results');

  const busy = Boolean(
    meta?.busy || progress?.status === 'running' || progress?.status === 'pausing',
  );

  const tabs = [
    { id: 'results' as const, label: t('crawl.tab.results') },
    { id: 'config' as const, label: t('crawl.tab.config') },
    ...(pages.length > 0
      ? [{ id: 'seo' as const, label: t('crawl.tab.seo') }]
      : []),
  ];
  const activeTab = tabs.some((x) => x.id === tab) ? tab : 'results';

  return (
    <section className="crawl-workspace">
      <div className="crawl-workspace__chrome">
        <CrawlToolbar busy={busy} />

        {meta?.error ? (
          <div className="border border-[var(--os-line-strong)] bg-[var(--os-panel)] px-3 py-2 text-sm">
            {meta.error}
          </div>
        ) : null}

        <PanelTabs
          ariaLabel={t('crawl.tabsLabel')}
          tabs={tabs}
          active={activeTab}
          onChange={setTab}
        />
      </div>

      <div className="crawl-workspace__body">
        <div
          id="panel-pane-results"
          role="tabpanel"
          aria-labelledby="panel-tab-results"
          hidden={activeTab !== 'results'}
          className="panel-tabs__pane crawl-workspace__table"
        >
          <CrawlResultsTable
            onNavigate={onNavigate}
            onViewAsGoogle={
              onNavigate
                ? (url) => {
                    requestGooglebotView(url);
                    openAnalysisSection('googlebot', onNavigate);
                  }
                : undefined
            }
          />
        </div>

        <div
          id="panel-pane-config"
          role="tabpanel"
          aria-labelledby="panel-tab-config"
          hidden={activeTab !== 'config'}
          className="panel-tabs__pane flex flex-col gap-4"
        >
          <CrawlConfigPanel value={config} onChange={(v) => void setConfig(v)} />
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-base font-semibold">{t('crawl.extras')}</h2>
            <SchedulePanel />
            <SerpPreviewPanel />
          </div>
        </div>

        {pages.length > 0 ? (
          <div
            id="panel-pane-seo"
            role="tabpanel"
            aria-labelledby="panel-tab-seo"
            hidden={activeTab !== 'seo'}
            className="panel-tabs__pane"
          >
            <SeoAuditSummary
              compact
              pages={pages}
              issues={issues}
              onSelectIssueCode={
                onNavigate
                  ? (code) => openIssuesFiltered(code, onNavigate)
                  : undefined
              }
            />
          </div>
        ) : null}
      </div>
    </section>
  );
});
