/**
 * Быстрый старт — полный автопайплайн: краул → все проверки → отчёты.
 * Состояние пайплайна в React Query — не сбрасывается при уходе с вкладки.
 */
import { memo, useEffect } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { NavSection, type NavSectionName } from '../../app/routes.const';
import { QueryKey } from '../../lib/query-keys.const';
import { ScoreRing, ProgressBar } from '../../components/ScoreRing';
import { PsiScoreRings } from '../../components/lighthouse/PsiScoreRings';
import { LighthouseReportSection } from '../../components/lighthouse/LighthouseReportSection';
import { SerpResultsView } from '../serp/SerpResultsView';
import { useProject } from '../projects/ProjectProvider';
import { ProjectKeywordsEditor } from '../projects/ProjectKeywordsEditor';
import {
  mergeKeywords,
  projectKeywords,
} from '../../../shared/utils/project-keywords.utils';
import { computeFixProgress, fixProgressCounts } from '../../../shared/utils/fix-progress.utils';
import {
  useCrawlActions,
  useCrawlIssues,
  useCrawlPageCount,
  useCrawlProgress,
} from '../crawl/use-crawl-queries';
import { QS_STAGE_ORDER, type QsStageStatus } from './quickstart-pipeline';
import { useQuickStartPipeline } from './use-quickstart-pipeline';
import {
  beginQuickStartRun,
  isQuickStartGeneration,
  isQuickStartRunCurrent,
  requestQuickStartAbort,
} from './quickstart-abort';

interface QuickStartPanelProps {
  onNavigate: (section: NavSectionName) => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const QuickStartPanel = memo(function QuickStartPanel({ onNavigate }: QuickStartPanelProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { active, updateProject } = useProject();
  const keywords = projectKeywords(active);
  const seedUrl = active?.startUrl ?? 'https://';
  const seedKeyword = keywords[0] ?? '';
  const { pipeline, patch, setStage, resetStages, markRunningErrors } = useQuickStartPipeline(
    seedUrl,
    seedKeyword,
  );
  const {
    running,
    stages,
    log,
    health,
    local,
    lh,
    serp,
    reportPath,
    sitemapPath,
    auditSections,
    url,
    keyword,
  } = pipeline;

  useEffect(() => {
    if (!active || running) return;
    // Re-seed URL only when project entry URL changes — keyword edits must not wipe a typed start URL.
    patch({ url: active.startUrl });
  }, [active?.id, active?.startUrl, running]);

  useEffect(() => {
    if (!active || running) return;
    if (pipeline.keyword) return;
    const fromProject = projectKeywords(active)[0] || '';
    if (fromProject) patch({ keyword: fromProject });
  }, [active?.id, active?.keywords, active?.keyword, running, pipeline.keyword]);

  const { start, stop } = useCrawlActions();
  const { data: progress } = useCrawlProgress();
  const { data: pageCount = 0 } = useCrawlPageCount();
  const { data: issues = [] } = useCrawlIssues();

  const fixProgress = local?.fixProgress ?? (issues.length > 0 ? computeFixProgress(issues) : null);
  const fixCounts = local
    ? { errors: local.errors, warnings: local.warnings }
    : fixProgressCounts(issues);

  const waitForCrawlEnd = async (generation: number) => {
    for (let i = 0; i < 600; i++) {
      if (!isQuickStartRunCurrent(generation)) throw new Error('Aborted');
      const state = await window.openspider.getCrawlState();
      queryClient.setQueryData(QueryKey.CrawlProgress, state.progress);
      queryClient.setQueryData(QueryKey.CrawlPages, state.pages);
      queryClient.setQueryData(QueryKey.CrawlIssues, state.issues);
      const s = state.progress.status;
      if (s === 'finished' || s === 'error' || s === 'idle') {
        if (s === 'error') throw new Error('Crawl ended with error');
        return state;
      }
      await sleep(1000);
    }
    throw new Error('Crawl timeout');
  };

  const runPipeline = async () => {
    const target = url.trim();
    if (!target) return;
    const generation = beginQuickStartRun();
    resetStages();
    patch({ running: true });

    let kw = keyword.trim();
    try {
      if (!kw) {
        try {
          kw = new URL(target).hostname.replace(/^www\./, '');
        } catch {
          kw = target;
        }
      }

      setStage('crawl', 'running');
      patch({ log: t('qs.auto.log.crawl') });
      await start.mutateAsync({
        startUrl: target,
        storeHtml: true,
        seedFromSitemap: true,
      });
      await waitForCrawlEnd(generation);
      if (!isQuickStartRunCurrent(generation)) throw new Error('Aborted');
      setStage('crawl', 'done');

      setStage('issues', 'running');
      const stateAfter = await window.openspider.getCrawlState();
      queryClient.setQueryData(QueryKey.CrawlIssues, stateAfter.issues);
      setStage('issues', 'done');

      setStage('lighthouse', 'running');
      setStage('serp', 'running');
      setStage('geo', 'running');
      patch({ log: t('qs.auto.log.checks') });

      const origin = (() => {
        try {
          return new URL(target).origin;
        } catch {
          return target;
        }
      })();

      const [psi, serpResult, llms] = await Promise.all([
        window.openspider.runPagespeed(target),
        window.openspider.runSerp(target, kw),
        window.openspider.probeLlmsTxt(origin),
      ]);
      if (!isQuickStartRunCurrent(generation)) throw new Error('Aborted');

      patch({ lh: psi, serp: serpResult });
      setStage('lighthouse', psi.error ? 'error' : 'done');
      setStage('serp', 'done');
      setStage('geo', 'done');

      setStage('score', 'running');
      const metrics = await window.openspider.getLocalMetrics();
      if (!isQuickStartRunCurrent(generation)) throw new Error('Aborted');
      patch({ local: metrics });

      const ranks = serpResult.engines
        .filter((e) => (e.kind ?? (e.query.startsWith('site:') ? 'site' : 'keyword')) === 'keyword')
        .map((e) => e.domainRank)
        .filter((r): r is number => r != null);
      const bestRank = ranks.length ? Math.min(...ranks) : null;
      const siteBest = serpResult.siteStats?.bestHitCount ?? 0;
      const siteBoost =
        serpResult.siteStats?.indexedSignal === 'strong'
          ? 85
          : serpResult.siteStats?.indexedSignal === 'weak'
            ? 55
            : 15;
      const visibility =
        bestRank == null
          ? Math.round(siteBoost * 0.7)
          : bestRank <= 3
            ? 95
            : bestRank <= 10
              ? 75
              : bestRank <= 20
                ? 55
                : Math.max(30, siteBoost);
      const perf = psi.performance ?? 0;
      const seoLh = psi.seo ?? 0;
      const overall = Math.round(
        metrics.healthScore * 0.35 +
          perf * 0.25 +
          seoLh * 0.15 +
          visibility * 0.15 +
          (llms.found ? 90 : 30) * 0.1,
      );
      patch({ health: overall });
      if (active?.id) {
        const nextKeywords = kw
          ? mergeKeywords(projectKeywords(active), [kw])
          : projectKeywords(active);
        void updateProject(active.id, {
          lastHealthScore: overall,
          lastCheckedAt: new Date().toISOString(),
          keywords: nextKeywords,
          keyword: nextKeywords[0],
          startUrl: target,
        });
      }
      patch({
        auditSections: [
          {
            id: 'technical',
            title: t('qs.auto.sec.tech'),
            score: metrics.healthScore,
            status: metrics.healthScore >= 75 ? 'pass' : metrics.healthScore >= 45 ? 'warn' : 'fail',
            notes: [
              `${metrics.pages} pages · ${metrics.errors}E / ${metrics.warnings}W`,
              `${metrics.orphans} orphans`,
            ],
          },
          {
            id: 'performance',
            title: t('qs.auto.sec.perf'),
            score: perf,
            status: psi.error ? 'fail' : perf >= 75 ? 'pass' : perf >= 45 ? 'warn' : 'fail',
            notes: psi.error
              ? [psi.error]
              : [`LCP ${psi.lcpMs ?? '—'} · CLS ${psi.cls ?? '—'} · SEO ${seoLh}`],
          },
          {
            id: 'visibility',
            title: t('qs.auto.sec.serp'),
            score: visibility,
            status: visibility >= 75 ? 'pass' : visibility >= 45 ? 'warn' : 'fail',
            notes: [
              bestRank != null ? `${t('qs.auto.bestRank')} #${bestRank}` : t('qs.auto.notInSerp'),
              `site:${serpResult.domain} → ${siteBest} hits (${serpResult.siteStats?.indexedSignal ?? 'none'})`,
            ],
          },
          {
            id: 'geo',
            title: t('qs.auto.sec.geo'),
            score: llms.found ? 90 : 25,
            status: llms.found ? 'pass' : 'warn',
            notes: [`${llms.url} → ${llms.statusCode}`],
          },
        ],
      });
      setStage('score', 'done');

      setStage('history', 'running');
      setStage('export', 'running');
      patch({ log: t('qs.auto.log.reports') });
      const title = `Quick Start · ${kw} · ${target}`;
      const exported = await window.openspider.autoExportReport(title);
      if (!exported.ok) throw new Error(exported.error);
      patch({ reportPath: exported.path });
      setStage('history', 'done');

      const sm = await window.openspider.autoExportSitemap();
      if ('path' in sm) {
        patch({ sitemapPath: sm.path });
        setStage('export', 'done');
      } else {
        setStage('export', 'error');
        patch({ log: sm.error });
      }

      patch({ log: t('qs.auto.log.done') });
    } catch (err) {
      if (!isQuickStartGeneration(generation)) return;
      const message = err instanceof Error ? err.message : String(err);
      patch({ log: message });
      markRunningErrors();
    } finally {
      if (!isQuickStartGeneration(generation)) return;
      patch({ running: false });
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: false, error: null });
    }
  };

  const doneCount = QS_STAGE_ORDER.filter((id) => stages[id] === 'done').length;
  const pipelineProgress = Math.round((doneCount / QS_STAGE_ORDER.length) * 100);
  const pipelineDone = QS_STAGE_ORDER.every((id) => stages[id] === 'done' || stages[id] === 'skip');

  return (
    <section className="mx-auto flex h-full max-w-4xl flex-col gap-5 overflow-auto pb-6">
      <header>
        <p className="admin-label">{t('qs.eyebrow')}</p>
        <h1 className="font-display mt-1 text-3xl font-semibold">{t('qs.title')}</h1>
        <p className="mt-2 text-sm text-[var(--os-muted)]">{t('qs.subtitle')}</p>
      </header>

      <div className="admin-panel flex flex-col gap-4 p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            value={url}
            onChange={(v) => patch({ url: v })}
            isDisabled={running}
          >
            <Label>{t('crawl.startUrl')}</Label>
            <Input placeholder="https://" data-testid="qs-url" />
          </TextField>
          <TextField
            value={keyword}
            onChange={(v) => patch({ keyword: v })}
            isDisabled={running}
          >
            <Label>{t('qs.auto.keyword')}</Label>
            <Input placeholder={t('qs.auto.keywordPh')} data-testid="qs-keyword" />
          </TextField>
        </div>

        <ProjectKeywordsEditor
          compact
          selected={keyword}
          onSelect={(v) => patch({ keyword: v })}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            data-testid="qs-start"
            isDisabled={!url.trim() || running}
            onPress={() => void runPipeline()}
          >
            {running ? t('qs.auto.running') : t('qs.auto.cta')}
          </Button>
          {running ? (
            <Button
              variant="secondary"
              onPress={() => {
                requestQuickStartAbort();
                stop.mutate();
              }}
            >
              {t('crawl.stop')}
            </Button>
          ) : null}
        </div>

        {(running || doneCount > 0) && (
          <div className="space-y-3 border border-[var(--os-line)] bg-[var(--os-panel-2)] p-4">
            <ProgressBar value={pipelineProgress} label={t('qs.auto.pipeline')} />
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {QS_STAGE_ORDER.map((id) => (
                <li
                  key={id}
                  className="flex items-center justify-between border border-[var(--os-line)] bg-[var(--os-panel)] px-3 py-2 text-sm"
                >
                  <span>{t(`qs.auto.stage.${id}` as MessageKey)}</span>
                  <StageBadge status={stages[id]} t={t} />
                </li>
              ))}
            </ul>
            <div className="font-mono text-xs text-[var(--os-muted)]">
              {t('overview.stat.status')}: {progress?.status ?? '—'} · {t('overview.stat.pages')}:{' '}
              {pageCount} · {t('overview.stat.errors')}:{' '}
              {issues.filter((i) => i.severity === 'error').length}
            </div>
            {log ? <p className="text-sm text-[var(--os-muted)]">{log}</p> : null}
          </div>
        )}
      </div>

      {(pipelineDone || health > 0) && !running ? (
        <div className="grid gap-4">
          <div className="admin-panel flex flex-wrap items-center gap-6 p-5">
            <ScoreRing score={health} label={t('metrics.health')} size={112} />
            <div className="min-w-[200px] flex-1 space-y-3">
              <ProgressBar
                value={fixProgress}
                label={t('metrics.fixProgress')}
                hint={t('metrics.fixProgressHint', {
                  errors: String(fixCounts.errors),
                  warnings: String(fixCounts.warnings),
                })}
              />
              <p className="text-sm text-[var(--os-muted)]">{t('qs.auto.resultHint')}</p>
            </div>
            {lh && !lh.error ? <PsiScoreRings scores={lh} size={64} /> : null}
          </div>

          {lh && !lh.error ? <LighthouseReportSection scores={lh} /> : null}

          {auditSections.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {auditSections.map((s) => (
                <article key={s.id} className="admin-panel p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-medium">{s.title}</h3>
                    <span
                      className={`status-pill ${
                        s.status === 'pass'
                          ? 'status-2xx'
                          : s.status === 'warn'
                            ? 'status-4xx'
                            : 'status-5xx'
                      }`}
                    >
                      {s.score}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-[var(--os-muted)]">
                    {s.notes.map((n) => (
                      <li key={n}>· {n}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : null}

          {serp ? (
            <article className="admin-panel p-4">
              <SerpResultsView serp={serp} onNavigate={onNavigate} />
            </article>
          ) : null}

          <div className="admin-panel space-y-2 p-4 text-sm">
            <h3 className="font-display text-base font-semibold">{t('qs.auto.artifacts')}</h3>
            {reportPath ? (
              <p className="font-mono text-xs break-all text-[var(--os-muted)]">
                JSON: {reportPath}
              </p>
            ) : null}
            {sitemapPath ? (
              <p className="font-mono text-xs break-all text-[var(--os-muted)]">
                Sitemap: {sitemapPath}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="primary" onPress={() => onNavigate(NavSection.Issues)}>
                {t('qs.auto.openIssues')}
              </Button>
              <Button variant="secondary" onPress={() => onNavigate(NavSection.Reports)}>
                {t('nav.reports')}
              </Button>
              <Button variant="secondary" onPress={() => onNavigate(NavSection.History)}>
                {t('nav.history')}
              </Button>
              <Button variant="ghost" onPress={() => onNavigate(NavSection.Metrics)}>
                {t('nav.metrics')}
              </Button>
              <Button variant="ghost" onPress={() => onNavigate(NavSection.Visualization)}>
                {t('nav.visualization')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
});

function StageBadge({
  status,
  t,
}: {
  status: QsStageStatus;
  t: (key: MessageKey) => string;
}) {
  const label = t(`qs.auto.status.${status}` as MessageKey);
  const cls =
    status === 'done'
      ? 'status-2xx'
      : status === 'running'
        ? 'status-3xx'
        : status === 'error'
          ? 'status-5xx'
          : status === 'skip'
            ? 'status-4xx'
            : '';
  return <span className={`status-pill ${cls}`}>{label}</span>;
}
