/**
 * Единый снимок отчёта: crawl summary + audit sections + Lighthouse/SERP/previews.
 */
import { memo, useMemo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { ScoreRing, ProgressBar } from '../../components/ScoreRing';
import { PsiScoreRings } from '../../components/lighthouse/PsiScoreRings';
import { LighthouseReportSection } from '../../components/lighthouse/LighthouseReportSection';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { PreviewCards } from '../preview/PreviewCards';
import { SerpResultsView } from '../serp/SerpResultsView';
import type { SeoReport } from '../../../shared/types/report.types';
import { reportHealthScore, resolveAuditInsights } from '../../../shared/utils/report.utils';
import { CrawlAnalyticsCharts } from '../../components/charts/CrawlAnalyticsCharts';
import { ReportRecommendationsList, ShadowRiskCard } from '../../components/ReportInsights';
import type { NavSectionName } from '../../app/routes.const';

export const UnifiedReportView = memo(function UnifiedReportView({
  report,
  onNavigate,
}: {
  report: SeoReport;
  onNavigate?: (section: NavSectionName) => void;
}) {
  const { t } = useI18n();
  const { summary, audit } = report;
  const seo = summary.seo;
  const health = reportHealthScore(report) ?? seo?.healthScore ?? 0;
  const local = audit?.localMetrics;
  const lighthouse = audit?.lighthouse;
  const insights = useMemo(() => resolveAuditInsights(report), [report]);

  return (
    <div className="grid gap-4">
      <div className="admin-panel flex flex-wrap items-center gap-6 p-4">
        <ScoreRing score={health} label={t('reports.snapshot.health')} size={112} />
        <div className="min-w-[200px] flex-1 space-y-3">
          {local ? (
            <ProgressBar
              value={local.fixProgress}
              label={t('labs.audit.fixProgress')}
              hint={t('labs.audit.fixProgressHint', {
                errors: String(local.errors),
                warnings: String(local.warnings),
              })}
            />
          ) : null}
          <div className="min-w-0 text-sm text-[var(--os-muted)]">
            <AnalyzeUrl url={summary.startUrl} compact preferPage={false} onNavigate={onNavigate} />
            {audit?.keyword ? (
              <span className="mt-1 block text-xs">«{audit.keyword}»</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-[var(--os-muted)]">
            <span>
              {t('reports.snapshot.pages')}: {summary.pages}
            </span>
            <span>
              {t('reports.snapshot.errors')}: {summary.errors}
            </span>
            <span>
              {t('reports.snapshot.warnings')}: {summary.warnings}
            </span>
          </div>
        </div>
        {lighthouse && !lighthouse.error ? (
          <PsiScoreRings scores={lighthouse} />
        ) : null}
      </div>

      {lighthouse && !lighthouse.error ? (
        <LighthouseReportSection scores={lighthouse} />
      ) : null}

      {report.state.pages.length > 0 || report.state.issues.length > 0 ? (
        <CrawlAnalyticsCharts pages={report.state.pages} issues={report.state.issues} />
      ) : null}

      {seo ? (
        <article className="admin-panel p-4">
          <h3 className="font-display text-base font-semibold">{t('reports.snapshot.seoAudit')}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            <MiniStat label={t('reports.snapshot.indexable')} value={seo.indexablePages} />
            <MiniStat label={t('reports.snapshot.withTitle')} value={seo.withTitle} />
            <MiniStat label={t('reports.snapshot.withDescription')} value={seo.withDescription} />
            <MiniStat label={t('reports.snapshot.withH1')} value={seo.withH1} />
            <MiniStat label={t('reports.snapshot.withCanonical')} value={seo.withCanonical} />
            <MiniStat label={t('reports.snapshot.withJsonLd')} value={seo.withJsonLd} />
          </div>
          {seo.topIssueCodes.length > 0 ? (
            <>
              <h4 className="admin-label mt-4">{t('reports.snapshot.topIssues')}</h4>
              <ul className="mt-2 space-y-1 text-xs text-[var(--os-muted)]">
                {seo.topIssueCodes.slice(0, 8).map((i) => (
                  <li key={i.code}>
                    · {i.code} — {i.count} ({i.severity})
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </article>
      ) : null}

      {audit?.sections && audit.sections.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {audit.sections.map((s) => (
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

      {local ? (
        <article className="admin-panel p-4">
          <h3 className="font-display text-base font-semibold">{t('reports.snapshot.localMetrics')}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <MiniStat label={t('reports.snapshot.orphans')} value={local.orphans} />
            <MiniStat label={t('reports.snapshot.indexableShare')} value={`${local.indexableShare}%`} />
            <MiniStat label={t('reports.snapshot.avgDepth')} value={local.avgDepth.toFixed(1)} />
            <MiniStat label={t('reports.snapshot.avgInlinks')} value={local.avgInlinks.toFixed(1)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {local.buckets.map((b) => (
              <span key={b.label} className="status-pill text-xs">
                {b.label}: {b.count}
              </span>
            ))}
          </div>
        </article>
      ) : null}

      {audit?.previews && audit.previews.length > 0 ? (
        <article className="admin-panel p-4">
          <h3 className="font-display text-base font-semibold">{t('preview.section')}</h3>
          <div className="mt-4 space-y-6">
            {audit.previews.map((p) => (
              <div key={p.url}>
                <div className="mb-2 min-w-0">
                  <AnalyzeUrl url={p.url} compact preferPage={false} onNavigate={onNavigate} />
                </div>
                <PreviewCards data={p} />
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {audit?.serp ? (
        <article className="admin-panel p-4">
          <SerpResultsView serp={audit.serp} onNavigate={onNavigate} />
        </article>
      ) : null}

      {audit?.llms ? (
        <article className="admin-panel p-4">
          <h3 className="font-display text-base font-semibold">{t('reports.snapshot.llms')}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--os-muted)]">
            <AnalyzeUrl url={audit.llms.url} compact preferPage={false} onNavigate={onNavigate} />
            <span>
              → {audit.llms.status} ({audit.llms.ok ? 'OK' : 'missing'})
            </span>
          </div>
        </article>
      ) : null}

      {insights.shadowRisk ? <ShadowRiskCard analysis={insights.shadowRisk} /> : null}
      <ReportRecommendationsList items={insights.recommendations} />
    </div>
  );
});

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-[var(--os-line)] bg-[var(--os-panel-2)] px-2 py-2">
      <div className="admin-label">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold">{value}</div>
    </div>
  );
}
