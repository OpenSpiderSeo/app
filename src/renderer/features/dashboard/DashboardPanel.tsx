import { Button } from '@heroui/react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { ScoreRing, ProgressBar } from '../../components/ScoreRing';
import { PanelTabs } from '../../components/PanelTabs';
import { buildDashboardSummary } from './dashboard-summary.utils';
import {
  useCrawlIssues,
  useCrawlPageCount,
  useCrawlPages,
  useCrawlProgress,
} from '../crawl/use-crawl-queries';
import { SeoAuditSummary } from '../seo/SeoAuditSummary';
import { openIssuesFiltered, openAnalysisSection } from '../../lib/analyze-nav';
import { CrawlAnalyticsCharts } from '../../components/charts/CrawlAnalyticsCharts';
import { HealthTrendChart } from '../../components/charts/HealthTrendChart';
import { QueryKey } from '../../lib/query-keys.const';
import { useProject } from '../projects/ProjectProvider';
import { loadLastAudit, readLastAuditSync } from '../../lib/last-audit-cache';
import type { FullAuditResult, LighthouseScores } from '../../../shared/types/audit.types';
import { buildSeoAuditMetrics } from '../../../shared/utils/seo-audit.utils';
import { analyzeShadowRisk, countThinContentIssues } from '../../../shared/utils/shadow-risk.utils';
import { buildReportRecommendations } from '../../../shared/utils/report-recommendations.utils';
import { PsiScoreRings } from '../../components/lighthouse/PsiScoreRings';
import { LighthouseReportSection } from '../../components/lighthouse/LighthouseReportSection';
import { LighthouseScoresChart } from '../../components/charts/LighthouseScoresChart';
import { SerpResultsView } from '../serp/SerpResultsView';
import { ReportRecommendationsList, ShadowRiskCard } from '../../components/ReportInsights';

interface DashboardPanelProps {
  onNavigate: (section: NavSectionName) => void;
}

type DashTabId = 'overview' | 'charts' | 'seo' | 'speed' | 'ranks' | 'recs';

const PRIORITY_TONE: Record<
  ReturnType<typeof buildDashboardSummary>['priority'],
  'warn' | 'bad' | 'ok' | 'muted'
> = {
  crawl: 'warn',
  empty: 'muted',
  critical: 'bad',
  errors: 'bad',
  warnings: 'warn',
  ok: 'ok',
};

const PRIORITY_KEY: Record<
  ReturnType<typeof buildDashboardSummary>['priority'],
  MessageKey
> = {
  crawl: 'dash.priority.crawl',
  empty: 'dash.priority.empty',
  critical: 'dash.priority.critical',
  errors: 'dash.priority.errors',
  warnings: 'dash.priority.warnings',
  ok: 'dash.priority.ok',
};

const HEALTH_BAND_KEY: Record<string, MessageKey> = {
  critical: 'health.critical',
  weak: 'health.weak',
  good: 'health.good',
  excellent: 'health.excellent',
};

function hasLhScores(lh: LighthouseScores | null | undefined): lh is LighthouseScores {
  if (!lh) return false;
  return (
    lh.performance != null ||
    lh.accessibility != null ||
    lh.bestPractices != null ||
    lh.seo != null
  );
}

export const DashboardPanel = memo(function DashboardPanel({ onNavigate }: DashboardPanelProps) {
  const { t } = useI18n();
  const { active } = useProject();
  const queryClient = useQueryClient();
  const { data: progress } = useCrawlProgress();
  const { data: pageCount = 0 } = useCrawlPageCount();
  const { data: pages = [] } = useCrawlPages();
  const { data: issues = [] } = useCrawlIssues();
  const [tab, setTab] = useState<DashTabId>('overview');
  const projectId = active?.id ?? 'none';

  const { data: historyItems = [] } = useQuery({
    queryKey: QueryKey.HistoryList(projectId),
    queryFn: () => window.openspider.listHistory(),
    enabled: Boolean(active?.id),
  });

  const { data: lastAudit = null } = useQuery({
    queryKey: QueryKey.LastAudit(projectId),
    queryFn: () => loadLastAudit(projectId),
    initialData: () => (active?.id ? readLastAuditSync(projectId) : null),
    enabled: Boolean(active?.id),
    staleTime: Infinity,
  });

  // Seed React Query from disk when opening dashboard after audit elsewhere.
  useEffect(() => {
    if (!active?.id) return;
    const cached = queryClient.getQueryData<FullAuditResult | null>(QueryKey.LastAudit(projectId));
    if (cached) return;
    const sync = readLastAuditSync(projectId);
    if (sync) {
      queryClient.setQueryData(QueryKey.LastAudit(projectId), sync);
    }
  }, [active?.id, projectId, queryClient]);

  const summary = useMemo(
    () =>
      buildDashboardSummary({
        pages,
        issues,
        crawlStatus: progress?.status,
        crawlProgress: progress,
      }),
    [pages, issues, progress],
  );

  const startUrl = progress?.startUrl || active?.startUrl || '';

  const insights = useMemo(() => {
    if (pages.length === 0 && !lastAudit) return null;
    const seo = buildSeoAuditMetrics(pages, issues);
    const local = lastAudit?.local ?? undefined;
    const serp = lastAudit?.serp ?? null;
    const shadowRisk =
      lastAudit?.shadowRisk ??
      analyzeShadowRisk({
        serp,
        local,
        seo,
        thinContentCount: countThinContentIssues(issues),
      });
    const recommendations =
      lastAudit?.recommendations ??
      buildReportRecommendations({
        summary: {
          pages: local?.pages ?? pageCount,
          errors: local?.errors ?? issues.filter((i) => i.severity === 'error').length,
          warnings: local?.warnings ?? issues.filter((i) => i.severity === 'warning').length,
          infos: local?.infos ?? issues.filter((i) => i.severity === 'info').length,
          startUrl,
          seo,
        },
        issues,
        audit: lastAudit
          ? {
              serp: lastAudit.serp,
              localMetrics: lastAudit.local ?? undefined,
              lighthouse: lastAudit.lighthouse,
            }
          : local
            ? { localMetrics: local }
            : undefined,
        shadowRisk,
      });
    return { shadowRisk, recommendations };
  }, [pages, issues, lastAudit, pageCount, startUrl]);

  const statusKey = `crawl.status.${progress?.status ?? 'idle'}` as MessageKey;
  const metricsPending = summary.health === null;
  const priorityTone = PRIORITY_TONE[summary.priority];
  const priorityVars = {
    score: String(summary.health ?? 0),
    errors: String(summary.errors),
    warnings: String(summary.warnings),
  };

  const dashTabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: t('dash.tab.overview') },
        { id: 'charts' as const, label: t('dash.tab.charts') },
        { id: 'seo' as const, label: t('dash.tab.seo') },
        { id: 'speed' as const, label: t('dash.tab.speed') },
        { id: 'ranks' as const, label: t('dash.tab.ranks') },
        { id: 'recs' as const, label: t('dash.tab.recs') },
      ] satisfies { id: DashTabId; label: string }[],
    [t],
  );

  const activeTab = dashTabs.some((x) => x.id === tab) ? tab : 'overview';
  const lh = lastAudit?.lighthouse ?? null;
  const serp = lastAudit?.serp ?? null;

  return (
    <section className="flex h-full flex-col gap-4 overflow-auto">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-semibold">{t('dash.title')}</h1>
      </header>

      <PanelTabs
        ariaLabel={t('dash.tabsLabel')}
        tabs={dashTabs}
        active={activeTab}
        onChange={setTab}
      />

      <div
        id="panel-pane-overview"
        role="tabpanel"
        aria-labelledby="panel-tab-overview"
        hidden={activeTab !== 'overview'}
        className="panel-tabs__pane flex flex-col gap-5"
      >
        <div className="admin-panel dash-summary p-4 sm:p-5">
          <div className="dash-summary__row">
            <div className="dash-summary__ring">
              <ScoreRing
                score={lastAudit?.healthScore ?? summary.health ?? 0}
                pending={metricsPending && !lastAudit}
                label={t('metrics.health')}
                size={104}
              />
              {!metricsPending && summary.healthBand ? (
                <p
                  className={`dash-summary__band dash-summary__band--${summary.healthBand}`}
                >
                  {t(HEALTH_BAND_KEY[summary.healthBand])}
                </p>
              ) : null}
            </div>

            <div className="dash-summary__body">
              <ProgressBar
                value={summary.fixProgress}
                label={t('metrics.fixProgress')}
                hint={
                  summary.inProgress
                    ? t('dash.progressCrawl')
                    : summary.hasCrawlData
                      ? t('dash.progressHint', {
                          errors: String(summary.errors),
                          warnings: String(summary.warnings),
                        })
                      : t('dash.progressEmpty')
                }
              />
              <p className={`dash-summary__priority dash-summary__priority--${priorityTone}`}>
                {t(PRIORITY_KEY[summary.priority], priorityVars)}
              </p>
            </div>

            <div className="dash-summary__cta">
              <Button variant="primary" onPress={() => openAnalysisSection('audit', onNavigate)}>
                {t('dash.fullAudit')}
              </Button>
              <p className="dash-summary__cta-hint">{t('dash.fullAuditHint')}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label={t('overview.stat.status')} value={t(statusKey)} />
          <Stat label={t('overview.stat.pages')} value={String(Math.max(pageCount, progress?.fetched ?? 0))} />
          <Stat label={t('overview.stat.errors')} value={String(summary.errors)} />
          <Stat label={t('overview.stat.warnings')} value={String(summary.warnings)} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onPress={() => openAnalysisSection('metrics', onNavigate)}>
            {t('dash.a1.cta')}
          </Button>
          <Button variant="secondary" onPress={() => onNavigate(NavSection.Issues)}>
            {t('dash.a2.cta')}
          </Button>
          <Button variant="secondary" onPress={() => onNavigate(NavSection.Reports)}>
            {t('dash.a3.cta')}
          </Button>
        </div>

        <div className="admin-panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h2 className="font-display text-base font-semibold">{t('dash.docs.title')}</h2>
            <p className="mt-1 text-sm text-[var(--os-muted)]">{t('dash.docs.body')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onPress={() => onNavigate(NavSection.History)}>
              {t('nav.history')}
            </Button>
            <Button variant="primary" onPress={() => onNavigate(NavSection.Guide)}>
              {t('nav.guide')}
            </Button>
          </div>
        </div>
      </div>

      <div
        id="panel-pane-charts"
        role="tabpanel"
        aria-labelledby="panel-tab-charts"
        hidden={activeTab !== 'charts'}
        className="panel-tabs__pane flex flex-col gap-3"
      >
        {summary.hasCrawlData ? (
          <>
            <p className="text-xs text-[var(--os-muted)]">
              {summary.inProgress ? t('dash.charts.live') : t('charts.section.hint')}
            </p>
            <CrawlAnalyticsCharts pages={pages} issues={issues} />
            {!summary.inProgress && historyItems.length >= 2 ? (
              <div className="max-w-xl">
                <HealthTrendChart history={historyItems} />
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--os-muted)]">{t('dash.empty.charts')}</p>
        )}
      </div>

      <div
        id="panel-pane-seo"
        role="tabpanel"
        aria-labelledby="panel-tab-seo"
        hidden={activeTab !== 'seo'}
        className="panel-tabs__pane"
      >
        {pages.length > 0 ? (
          <SeoAuditSummary
            pages={pages}
            issues={issues}
            onSelectIssueCode={(code) => openIssuesFiltered(code, onNavigate)}
          />
        ) : (
          <p className="text-sm text-[var(--os-muted)]">{t('dash.empty.seo')}</p>
        )}
      </div>

      <div
        id="panel-pane-speed"
        role="tabpanel"
        aria-labelledby="panel-tab-speed"
        hidden={activeTab !== 'speed'}
        className="panel-tabs__pane"
      >
        {hasLhScores(lh) ? (
          <div className="admin-panel flex flex-col gap-4 p-4">
            <PsiScoreRings scores={lh} />
            <LighthouseScoresChart scores={lh} />
            <LighthouseReportSection scores={lh} />
            <div className="font-mono text-xs text-[var(--os-muted)]">
              {t('metrics.psi.source')}: {lh.source}
              {' · '}
              LCP {lh.lcpMs ?? '—'}ms · CLS {lh.cls ?? '—'} · INP {lh.inpMs ?? '—'}ms · TTFB{' '}
              {lh.ttfbMs ?? '—'}ms
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--os-muted)]">{t('dash.empty.speed')}</p>
        )}
      </div>

      <div
        id="panel-pane-ranks"
        role="tabpanel"
        aria-labelledby="panel-tab-ranks"
        hidden={activeTab !== 'ranks'}
        className="panel-tabs__pane"
      >
        {serp ? (
          <div className="admin-panel p-4">
            <SerpResultsView serp={serp} onNavigate={onNavigate} />
          </div>
        ) : (
          <p className="text-sm text-[var(--os-muted)]">{t('dash.empty.ranks')}</p>
        )}
      </div>

      <div
        id="panel-pane-recs"
        role="tabpanel"
        aria-labelledby="panel-tab-recs"
        hidden={activeTab !== 'recs'}
        className="panel-tabs__pane flex flex-col gap-4"
      >
        {insights?.shadowRisk || (insights?.recommendations && insights.recommendations.length > 0) ? (
          <>
            {insights.shadowRisk ? <ShadowRiskCard analysis={insights.shadowRisk} /> : null}
            {insights.recommendations?.length ? (
              <ReportRecommendationsList items={insights.recommendations} />
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[var(--os-muted)]">{t('dash.empty.recs')}</p>
        )}
      </div>
    </section>
  );
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-panel px-4 py-3">
      <div className="admin-label">{label}</div>
      <div className="font-display mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
