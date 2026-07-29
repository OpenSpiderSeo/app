/**
 * Показатели для SEO-специалиста: диагноз обхода → скорость → позиции.
 * Без обещаний трафика, пока нет подключений.
 */
import { Button, Input, Label, TextField } from '@heroui/react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import type {
  LighthouseScores,
  LocalMetricsSnapshot,
  RankCheck,
  SerpReport,
} from '../../../shared/types/audit.types';
import { ScoreRing, ProgressBar } from '../../components/ScoreRing';
import { PsiScoreRings } from '../../components/lighthouse/PsiScoreRings';
import { LighthouseReportSection } from '../../components/lighthouse/LighthouseReportSection';
import { SerpResultsView } from '../serp/SerpResultsView';
import { ProjectKeywordsEditor } from '../projects/ProjectKeywordsEditor';
import { useProject } from '../projects/ProjectProvider';
import { mergeKeywords, projectKeywords } from '../../../shared/utils/project-keywords.utils';
import {
  useCrawlIssues,
  useCrawlPageCount,
  useCrawlPages,
  useCrawlProgress,
  useIntegrationsQuery,
} from '../crawl/use-crawl-queries';
import { IssueCode } from '../../../shared/types/crawl.types';
import { openIssuesFiltered } from '../../lib/analyze-nav';
import { CrawlAnalyticsCharts } from '../../components/charts/CrawlAnalyticsCharts';
import { RankHistoryChart } from '../../components/charts/RankHistoryChart';
import { LighthouseScoresChart } from '../../components/charts/LighthouseScoresChart';
import { ReportRecommendationsList, ShadowRiskCard } from '../../components/ReportInsights';
import { analyzeShadowRisk, countThinContentIssues } from '../../../shared/utils/shadow-risk.utils';
import { buildReportRecommendations } from '../../../shared/utils/report-recommendations.utils';
import { buildSeoAuditMetrics } from '../../../shared/utils/seo-audit.utils';
import { computeFixProgress, fixProgressCounts } from '../../../shared/utils/fix-progress.utils';
import { PanelTabs } from '../../components/PanelTabs';
import { QueryKey } from '../../lib/query-keys.const';
import { loadLastAudit, publishLastAudit, readLastAuditSync } from '../../lib/last-audit-cache';
import type { FullAuditResult } from '../../../shared/types/audit.types';

type MetricsTabId = 'diagnosis' | 'speed' | 'ranks' | 'more';

function hasLhScores(lh: LighthouseScores | null): lh is LighthouseScores {
  if (!lh) return false;
  return (
    lh.performance != null ||
    lh.accessibility != null ||
    lh.bestPractices != null ||
    lh.seo != null
  );
}

const PSI_ERROR_KEYS = new Set([
  'metrics.psi.error.psi_rate_limited',
  'metrics.psi.error.psi_no_key',
  'metrics.psi.error.psi_unavailable',
]);

function psiErrorMessage(
  lh: LighthouseScores | null,
  t: (key: MessageKey, params?: Record<string, string | number>) => string,
): string | null {
  if (!lh?.error && !lh?.errorCode) return null;
  if (lh.errorCode) {
    const key = `metrics.psi.error.${lh.errorCode}` as MessageKey;
    if (PSI_ERROR_KEYS.has(key)) return t(key);
  }
  return lh.error ?? null;
}

interface MetricsPanelProps {
  onNavigate?: (section: NavSectionName) => void;
  /** Внутри Analysis hub — без lead и кнопки «Полная проверка». */
  embedded?: boolean;
}

export const MetricsPanel = memo(function MetricsPanel({ onNavigate, embedded = false }: MetricsPanelProps) {
  const { t } = useI18n();
  const { active, updateProject } = useProject();
  const queryClient = useQueryClient();
  const { data: issues = [] } = useCrawlIssues();
  const { data: pages = [] } = useCrawlPages();
  const { data: pageCount = 0 } = useCrawlPageCount();
  const { data: progress } = useCrawlProgress();
  const { data: integrations = [] } = useIntegrationsQuery();

  const projectId = active?.id ?? 'none';
  const { data: lastAudit = null } = useQuery({
    queryKey: QueryKey.LastAudit(projectId),
    queryFn: () => loadLastAudit(projectId),
    initialData: () => (active?.id ? readLastAuditSync(projectId) : null),
    enabled: Boolean(active?.id),
    staleTime: Infinity,
  });

  const [local, setLocal] = useState<LocalMetricsSnapshot | null>(null);
  const [lh, setLh] = useState<LighthouseScores | null>(null);
  const [serp, setSerp] = useState<SerpReport | null>(null);
  const [ranks, setRanks] = useState<RankCheck[]>([]);
  const keywords = projectKeywords(active);
  const [keyword, setKeyword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<MetricsTabId>('diagnosis');

  // Hydrate speed / ranks from last full audit so user doesn't re-click tools.
  useEffect(() => {
    if (!lastAudit) return;
    if (lastAudit.lighthouse) setLh((prev) => prev ?? lastAudit.lighthouse);
    if (lastAudit.serp) setSerp((prev) => prev ?? lastAudit.serp);
    if (lastAudit.local) setLocal((prev) => prev ?? lastAudit.local);
  }, [lastAudit]);

  const startUrl = progress?.startUrl || active?.startUrl || 'https://example.com/';

  const mergePartialAudit = (patch: Partial<FullAuditResult>) => {
    if (!active?.id) return;
    const base: FullAuditResult = lastAudit ?? {
      url: startUrl,
      keyword: keyword || keywords[0] || '',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      healthScore: local?.healthScore ?? 0,
      sections: [],
      lighthouse: lh,
      serp,
      local,
      llms: null,
    };
    publishLastAudit(queryClient, active.id, { ...base, ...patch, finishedAt: new Date().toISOString() });
  };

  const blocking = local?.errors ?? issues.filter((i) => i.severity === 'error').length;
  const fixProgress = useMemo(() => {
    if (local != null) return local.fixProgress;
    if (pageCount === 0 && issues.length === 0) return null;
    return computeFixProgress(issues);
  }, [local, pageCount, issues]);
  const fixCounts = useMemo(
    () =>
      local != null
        ? { errors: local.errors, warnings: local.warnings }
        : fixProgressCounts(issues),
    [local, issues],
  );

  useEffect(() => {
    if (!keyword && keywords[0]) setKeyword(keywords[0]);
  }, [active?.id, keywords, keyword]);

  const refreshLocal = async () => {
    const snap = await window.openspider.getLocalMetrics();
    setLocal(snap);
  };

  useEffect(() => {
    void refreshLocal();
  }, [pageCount, issues.length]);

  useEffect(() => {
    void window.openspider.listRanks().then(setRanks);
  }, [active?.id]);

  const priority = useMemo(() => {
    if (pageCount === 0) return { key: 'metrics.priority.empty' as const, tone: 'warn' as const };
    if (blocking > 0) return { key: 'metrics.priority.fix' as const, tone: 'bad' as const };
    return { key: 'metrics.priority.ok' as const, tone: 'ok' as const };
  }, [pageCount, blocking]);

  const metricsInsights = useMemo(() => {
    if (pageCount === 0 && !serp) return null;
    const seo = buildSeoAuditMetrics(pages, issues);
    const shadowRisk = analyzeShadowRisk({
      serp,
      local: local ?? undefined,
      seo,
      thinContentCount: countThinContentIssues(issues),
    });
    const recommendations = buildReportRecommendations({
      summary: {
        pages: local?.pages ?? pageCount,
        errors: local?.errors ?? issues.filter((i) => i.severity === 'error').length,
        warnings: local?.warnings ?? issues.filter((i) => i.severity === 'warning').length,
        infos: local?.infos ?? issues.filter((i) => i.severity === 'info').length,
        startUrl,
        seo,
      },
      issues,
      audit: serp ? { serp, localMetrics: local ?? undefined } : local ? { localMetrics: local } : undefined,
      shadowRisk,
    });
    return { shadowRisk, recommendations };
  }, [pageCount, serp, local, pages, issues, startUrl]);

  const ensureKeywordSaved = async (kw: string) => {
    if (!active || !kw.trim()) return;
    const trimmed = kw.trim();
    const exists = keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    const next = mergeKeywords(keywords, [trimmed]);
    await updateProject(active.id, { keywords: next, keyword: next[0] });
  };

  const saveSerpRank = async (result: SerpReport) => {
    const brandEngines = result.engines.filter(
      (e) => (e.kind ?? (e.query.startsWith('site:') ? 'site' : 'keyword')) === 'keyword',
    );
    await window.openspider.saveRank({
      keyword: result.keyword,
      domain: result.domain,
      engines: brandEngines.map((e) => ({
        engine: e.engine,
        rank: e.domainRank,
      })),
    });
  };

  const runPsi = async (localOnly = false) => {
    setBusy(true);
    setMsg(null);
    try {
      const result = await window.openspider.runPagespeed(startUrl, localOnly);
      setLh(result);
      mergePartialAudit({ lighthouse: result, url: startUrl });
      const note = psiErrorMessage(result, t);
      setMsg(note ?? (localOnly ? t('metrics.psi.localDone') : t('metrics.psi.done')));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const runSerp = async () => {
    const kw = keyword.trim();
    if (!kw) {
      setMsg(t('keywords.pickOrAdd'));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await ensureKeywordSaved(kw);
      const result = await window.openspider.runSerp(startUrl, kw);
      setSerp(result);
      await saveSerpRank(result);
      setRanks(await window.openspider.listRanks());
      mergePartialAudit({ serp: result, url: startUrl, keyword: kw });
      setMsg(t('metrics.serp.done'));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const runSerpAll = async () => {
    const list = keywords.length > 0 ? keywords : keyword.trim() ? [keyword.trim()] : [];
    if (list.length === 0) {
      setMsg(t('keywords.pickOrAdd'));
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let last: SerpReport | null = null;
      for (const kw of list) {
        const result = await window.openspider.runSerp(startUrl, kw);
        last = result;
        await saveSerpRank(result);
      }
      if (last) {
        setSerp(last);
        mergePartialAudit({ serp: last, url: startUrl, keyword: last.keyword });
      }
      setRanks(await window.openspider.listRanks());
      setMsg(t('metrics.serp.doneAll', { count: list.length }));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const lhSpeedError = psiErrorMessage(lh, t);
  const showCharts =
    pages.length > 0 ||
    issues.length > 0 ||
    (local?.buckets?.some((b) => b.count > 0) ?? false);

  return (
    <section className={`metrics-desk flex min-w-0 flex-col gap-4 ${embedded ? '' : 'pb-2'}`}>
      {!embedded ? <p className="hub-panel__lead">{t('metrics.subtitle')}</p> : null}

      <PanelTabs
        ariaLabel={t('metrics.tabsLabel')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'diagnosis', label: t('metrics.tab.diagnosis') },
          { id: 'speed', label: t('metrics.tab.speed') },
          { id: 'ranks', label: t('metrics.tab.ranks') },
          { id: 'more', label: t('metrics.tab.more') },
        ]}
      />

      <div
        id="panel-pane-diagnosis"
        role="tabpanel"
        aria-labelledby="panel-tab-diagnosis"
        hidden={tab !== 'diagnosis'}
        className="panel-tabs__pane flex flex-col gap-4"
      >
        <div className="admin-panel metrics-desk__diag p-5">
          <div className="flex flex-wrap items-center gap-6">
            <ScoreRing
              score={local?.healthScore ?? 0}
              label={t('metrics.health')}
              size={112}
            />
            <div className="min-w-[220px] flex-1 space-y-3">
              <ProgressBar
                value={fixProgress}
                label={t('metrics.fixProgress')}
                hint={t('metrics.fixProgressHint', {
                  errors: String(fixCounts.errors),
                  warnings: String(fixCounts.warnings),
                })}
              />
              <p className={`metrics-desk__priority metrics-desk__priority--${priority.tone}`}>
                {t(priority.key, { count: blocking })}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label={t('metrics.stat.pages')} value={String(local?.pages ?? pageCount)} />
                <Stat
                  label={t('metrics.stat.blocking')}
                  value={String(blocking)}
                  onClick={
                    blocking > 0 && onNavigate
                      ? () => {
                          onNavigate(NavSection.Issues);
                        }
                      : undefined
                  }
                />
                <Stat
                  label={t('metrics.kpi.orphans')}
                  value={String(local?.orphans ?? 0)}
                  onClick={
                    (local?.orphans ?? 0) > 0 && onNavigate
                      ? () => openIssuesFiltered(IssueCode.OrphanPage, onNavigate)
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" isDisabled={busy} onPress={() => void refreshLocal()}>
              {t('metrics.refresh')}
            </Button>
            {onNavigate ? (
              <Button variant="primary" onPress={() => onNavigate(NavSection.Issues)}>
                {t('metrics.priority.openIssues')}
              </Button>
            ) : null}
          </div>
        </div>

        {showCharts ? (
          <div className="admin-panel p-4">
            <p className="text-xs text-[var(--os-muted)]">{t('charts.section.hint')}</p>
            <CrawlAnalyticsCharts pages={pages} issues={issues} statusBuckets={local?.buckets} />
          </div>
        ) : null}
      </div>

      <div
        id="panel-pane-speed"
        role="tabpanel"
        aria-labelledby="panel-tab-speed"
        hidden={tab !== 'speed'}
        className="panel-tabs__pane"
      >
        <section className="metrics-desk__block metrics-desk__speed admin-panel p-4">
          <header className="metrics-desk__block-head">
            <h2 className="font-display text-lg font-medium">{t('metrics.section.speed')}</h2>
            <p className="text-xs text-[var(--os-muted)]">{t('metrics.block.cwv.sources')}</p>
          </header>
          <p className="metrics-desk__speed-hint">{t('metrics.section.speedHint')}</p>

          {hasLhScores(lh) ? (
            <div className="metrics-desk__speed-results mt-4 space-y-4">
              {lhSpeedError ? (
                <p className="metrics-desk__speed-error-banner">
                  <span className="font-medium text-[var(--os-ink)]">{t('metrics.section.speedError')}: </span>
                  {lhSpeedError}
                </p>
              ) : null}
              <PsiScoreRings scores={lh} />
              <LighthouseScoresChart scores={lh} />
              <LighthouseReportSection scores={lh} />
              <div className="w-full font-mono text-xs text-[var(--os-muted)]">
                {t('metrics.psi.source')}: {lh.source}
                {' · '}
                LCP {lh.lcpMs ?? '—'}ms · CLS {lh.cls ?? '—'} · INP {lh.inpMs ?? '—'}ms · TTFB{' '}
                {lh.ttfbMs ?? '—'}ms
              </div>
            </div>
          ) : null}

          <div
            className="metrics-desk__speed-empty"
            role="region"
            aria-label={t('metrics.section.speed')}
          >
            {!hasLhScores(lh) ? (
              <>
                <p className="metrics-desk__speed-empty-title">{t('metrics.section.speedEmpty')}</p>
                <p className="metrics-desk__speed-empty-hint">{t('metrics.section.speedEmptyHint')}</p>
                {lhSpeedError ? (
                  <p className="metrics-desk__speed-error-banner">
                    <span className="font-medium">{t('metrics.section.speedError')}: </span>
                    {lhSpeedError}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="metrics-desk__speed-empty-hint">{t('metrics.section.speedRerun')}</p>
            )}
            <div className="metrics-desk__speed-actions">
              <button
                type="button"
                className="os-btn os-btn--primary"
                disabled={busy}
                onClick={() => void runPsi(false)}
              >
                {t('metrics.psi.run')}
              </button>
              <button
                type="button"
                className="os-btn os-btn--ghost"
                disabled={busy}
                onClick={() => void runPsi(true)}
              >
                {t('metrics.psi.runLocal')}
              </button>
            </div>
            {msg ? <p className="mt-3 text-sm text-[var(--os-muted)]">{msg}</p> : null}
          </div>
        </section>
      </div>

      <div
        id="panel-pane-ranks"
        role="tabpanel"
        aria-labelledby="panel-tab-ranks"
        hidden={tab !== 'ranks'}
        className="panel-tabs__pane"
      >
        <section className="metrics-desk__block admin-panel p-4">
          <header className="metrics-desk__block-head">
            <h2 className="font-display text-lg font-medium">{t('metrics.section.ranks')}</h2>
            <p className="text-xs text-[var(--os-muted)]">{t('metrics.serp.hint')}</p>
          </header>
          <div className="mt-3">
            <ProjectKeywordsEditor selected={keyword} onSelect={setKeyword} />
          </div>
          <TextField className="mt-3" value={keyword} onChange={setKeyword}>
            <Label>{t('metrics.serp.keyword')}</Label>
            <Input placeholder={t('keywords.addPh')} />
          </TextField>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" isDisabled={busy} onPress={() => void runSerp()}>
              {t('metrics.serp.run')}
            </Button>
            <Button variant="secondary" isDisabled={busy} onPress={() => void runSerpAll()}>
              {t('metrics.serp.runAll')}
            </Button>
          </div>
          {serp ? (
            <div className="mt-4 border-t border-[var(--os-line)] pt-4">
              <SerpResultsView serp={serp} onNavigate={onNavigate} />
            </div>
          ) : null}

          <div className="mt-5 border-t border-[var(--os-line)] pt-4">
            <RankHistoryChart ranks={ranks} />
          </div>

          <div className="mt-5 border-t border-[var(--os-line)] pt-4">
            <h3 className="font-display text-base font-medium">{t('metrics.rank.title')}</h3>
            <p className="mt-1 text-sm text-[var(--os-muted)]">{t('metrics.rank.body')}</p>
            {ranks.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--os-muted)]">{t('metrics.rank.empty')}</p>
            ) : (
              <div className="mt-3 overflow-auto border border-[var(--os-line)]">
                <table className="os-table w-full text-left text-sm">
                  <thead className="bg-[var(--os-panel-2)] text-[11px] uppercase text-[var(--os-faint)]">
                    <tr>
                      <th className="px-2 py-1">{t('metrics.rank.col.at')}</th>
                      <th className="px-2 py-1">{t('metrics.rank.col.keyword')}</th>
                      <th className="px-2 py-1">{t('metrics.rank.col.domain')}</th>
                      <th className="px-2 py-1">{t('metrics.rank.col.engines')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranks.slice(0, 20).map((r) => (
                      <tr key={r.id} className="border-t border-[var(--os-line)]">
                        <td className="os-table-num px-2 py-1 text-xs tabular-nums">{r.at.slice(0, 16)}</td>
                        <td className="px-2 py-1">{r.keyword}</td>
                        <td className="os-table-url px-2 py-1">{r.domain}</td>
                        <td className="os-table-num px-2 py-1 text-xs tabular-nums">
                          {r.engines
                            .map((e) => `${e.engine}:${e.rank != null ? `#${e.rank}` : '—'}`)
                            .join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      <div
        id="panel-pane-more"
        role="tabpanel"
        aria-labelledby="panel-tab-more"
        hidden={tab !== 'more'}
        className="panel-tabs__pane flex flex-col gap-4"
      >
        <section className="metrics-desk__block admin-panel p-4">
          <header className="metrics-desk__block-head">
            <h2 className="font-display text-base font-medium">{t('metrics.connect.title')}</h2>
          </header>
          <p className="mt-1 text-sm text-[var(--os-muted)]">{t('metrics.connect.body')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {integrations.map((item) => {
              const statusKey = `integrations.status.${item.status}` as MessageKey;
              return (
                <span key={item.id} className="os-badge text-xs">
                  {item.name}: {t(statusKey)}
                </span>
              );
            })}
          </div>
          {onNavigate ? (
            <div className="mt-3">
              <Button variant="secondary" onPress={() => onNavigate(NavSection.Integrations)}>
                {t('metrics.openIntegrations')}
              </Button>
            </div>
          ) : null}
          {msg ? <p className="mt-3 text-sm text-[var(--os-muted)]">{msg}</p> : null}
        </section>

        {metricsInsights?.shadowRisk ? (
          <ShadowRiskCard analysis={metricsInsights.shadowRisk} />
        ) : null}
        {metricsInsights?.recommendations ? (
          <ReportRecommendationsList items={metricsInsights.recommendations} />
        ) : null}
      </div>
    </section>
  );
});

function Stat({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick?: () => void;
}) {
  if (onClick) {
    return (
      <button type="button" className="os-stat os-stat--clickable border border-[var(--os-line)] px-2 py-2" onClick={onClick}>
        <div className="os-stat__label">{label}</div>
        <div className="os-stat__value">{value}</div>
      </button>
    );
  }
  return (
    <div className="os-stat border border-[var(--os-line)] px-2 py-2">
      <div className="os-stat__label">{label}</div>
      <div className="os-stat__value">{value}</div>
    </div>
  );
}
