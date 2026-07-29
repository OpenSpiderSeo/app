/**
 * Labs = комплексный SEO-аудит под ключ (crawl + Lighthouse + SERP + GEO).
 * Одна активная вкладка: аудит или отдельный инструмент.
 */
import { memo, useEffect, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from '../../lib/query-keys.const';
import { useI18n } from '../../i18n/I18nProvider';
import type { FullAuditResult } from '../../../shared/types/audit.types';
import { ScoreRing, ProgressBar } from '../../components/ScoreRing';
import { PsiScoreRings } from '../../components/lighthouse/PsiScoreRings';
import { LighthouseReportSection } from '../../components/lighthouse/LighthouseReportSection';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { PanelTabs } from '../../components/PanelTabs';
import { CustomToolsPanel } from './CustomToolsPanel';
import { SliceAToolsPanel, type SliceAToolId } from './SliceAToolsPanel';
import { PreviewCards } from '../preview/PreviewCards';
import { SerpResultsView } from '../serp/SerpResultsView';
import { ProjectKeywordsEditor } from '../projects/ProjectKeywordsEditor';
import { useProject } from '../projects/ProjectProvider';
import { mergeKeywords, projectKeywords } from '../../../shared/utils/project-keywords.utils';
import { ReportRecommendationsList, ShadowRiskCard } from '../../components/ReportInsights';
import { publishLastAudit, readLastAuditSync } from '../../lib/last-audit-cache';

type LabsTabId = 'audit' | SliceAToolId | 'custom' | 'indexnow';

export const LabsPanel = memo(function LabsPanel({
  embedded = false,
  prominentCta = false,
}: {
  embedded?: boolean;
  /** В сегменте «Анализ» — крупный первичный CTA. */
  prominentCta?: boolean;
}) {
  const { t } = useI18n();
  const { active, updateProject } = useProject();
  const queryClient = useQueryClient();
  const keywords = projectKeywords(active);
  const [url, setUrl] = useState(active?.startUrl ?? 'https://example.com/');
  const [keyword, setKeyword] = useState(keywords[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [audit, setAudit] = useState<FullAuditResult | null>(() =>
    active?.id ? readLastAuditSync(active.id) : null,
  );
  const [indexNowKey, setIndexNowKey] = useState('');
  const [tab, setTab] = useState<LabsTabId>('audit');

  useEffect(() => {
    if (!active?.id) return;
    const cached = readLastAuditSync(active.id);
    if (cached) setAudit(cached);
  }, [active?.id]);
  useEffect(() => {
    if (!active) return;
    // Only re-seed URL when the project entry URL changes — not on keyword edits
    // (otherwise a typed root URL is overwritten by project …/en after updateProject).
    setUrl(active.startUrl);
  }, [active?.id, active?.startUrl]);

  useEffect(() => {
    if (!active) return;
    const list = projectKeywords(active);
    setKeyword((prev) => prev || list[0] || '');
  }, [active?.id, active?.keywords, active?.keyword]);

  useEffect(() => {
    void window.openspider?.getSecrets().then((s) => {
      if (s.indexNowKey) setIndexNowKey(s.indexNowKey);
    });
  }, []);

  const { data: credits = [] } = useQuery({
    queryKey: [...QueryKey.Integrations, 'oss-credits'],
    queryFn: () => window.openspider.listOssCredits(),
    enabled: Boolean(window.openspider),
  });

  const runAudit = async (runCrawl: boolean) => {
    setBusy(true);
    setMessage(null);
    try {
      const kw = keyword.trim();
      if (active && kw) {
        const next = mergeKeywords(projectKeywords(active), [kw]);
        await updateProject(active.id, { keywords: next, keyword: next[0] });
      }
      const result = await window.openspider.runFullAudit({ url, keyword: kw, runCrawl });
      setAudit(result);
      if (active?.id) {
        publishLastAudit(queryClient, active.id, result);
      }
      setMessage(t('labs.audit.done'));
      setTab('audit');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 overflow-visible">
      {!embedded ? <p className="hub-panel__lead">{t('labs.subtitle')}</p> : null}

      <PanelTabs
        ariaLabel={t('labs.tabsLabel')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'audit', label: t('labs.tab.audit') },
          { id: 'mentions', label: t('labs.tab.mentions') },
          { id: 'sitemap', label: t('labs.tab.sitemap') },
          { id: 'outbound', label: t('labs.tab.outbound') },
          { id: 'custom', label: t('labs.tab.custom') },
          { id: 'indexnow', label: t('labs.tab.indexnow') },
        ]}
      />

      <div
        id="panel-pane-audit"
        role="tabpanel"
        aria-labelledby="panel-tab-audit"
        hidden={tab !== 'audit'}
        className="panel-tabs__pane flex flex-col gap-5"
      >
        <article
          className={`admin-panel p-4${prominentCta ? ' analysis-audit-cta' : ''}`}
          data-testid="labs-audit-card"
        >
          <h2 className="font-display text-lg font-semibold">{t('labs.audit.title')}</h2>
          <p className="mt-1 text-sm text-[var(--os-muted)]">{t('labs.audit.body')}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <TextField value={url} onChange={setUrl}>
              <Label>{t('labs.audit.url')}</Label>
              <Input data-testid="labs-audit-url" />
            </TextField>
            <TextField value={keyword} onChange={setKeyword}>
              <Label>{t('labs.audit.keyword')}</Label>
              <Input data-testid="labs-audit-keyword" placeholder={t('keywords.addPh')} />
            </TextField>
          </div>
          <div className="mt-3">
            <ProjectKeywordsEditor compact selected={keyword} onSelect={setKeyword} />
          </div>
          <div className={`mt-4 flex flex-wrap gap-2${prominentCta ? ' analysis-audit-cta__actions' : ''}`}>
            {prominentCta ? (
              <button
                type="button"
                className="os-btn os-btn--primary os-btn--lg"
                disabled={busy || !url.trim()}
                onClick={() => void runAudit(true)}
              >
                {busy ? t('labs.audit.running') : t('labs.audit.run')}
              </button>
            ) : (
              <Button
                variant="primary"
                isDisabled={busy || !url.trim()}
                onPress={() => void runAudit(true)}
              >
                {busy ? t('labs.audit.running') : t('labs.audit.run')}
              </Button>
            )}
            <Button
              variant="secondary"
              isDisabled={busy || !url.trim()}
              onPress={() => void runAudit(false)}
            >
              {t('labs.audit.runExisting')}
            </Button>
          </div>
          {message && tab === 'audit' ? (
            <p className="mt-3 text-sm text-[var(--os-muted)]">{message}</p>
          ) : null}
        </article>

        {audit ? (
          <div className="grid gap-4">
            <div className="admin-panel flex flex-wrap items-center gap-6 p-4">
              <ScoreRing score={audit.healthScore} label={t('labs.audit.health')} size={112} />
              <div className="min-w-[200px] flex-1 space-y-3">
                <ProgressBar
                  value={
                    audit.local != null
                      ? audit.local.fixProgress
                      : null
                  }
                  label={t('labs.audit.fixProgress')}
                  hint={
                    audit.local
                      ? t('labs.audit.fixProgressHint', {
                          errors: String(audit.local.errors),
                          warnings: String(audit.local.warnings),
                        })
                      : undefined
                  }
                />
                <p className="text-sm text-[var(--os-muted)]">
                  <AnalyzeUrl url={audit.url} compact preferPage={false} />
                  {audit.keyword ? <> · «{audit.keyword}»</> : null}
                </p>
              </div>
              {audit.lighthouse && !audit.lighthouse.error ? (
                <PsiScoreRings scores={audit.lighthouse} />
              ) : null}
            </div>

            {audit.lighthouse && !audit.lighthouse.error ? (
              <details className="labs-tools">
                <summary className="labs-tools__summary">{t('labs.results.lighthouse')}</summary>
                <div className="labs-tools__body mt-3">
                  <LighthouseReportSection scores={audit.lighthouse} />
                </div>
              </details>
            ) : null}

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

            {(audit.previews?.length || audit.serp || audit.shadowRisk || audit.recommendations) ? (
              <details className="labs-tools">
                <summary className="labs-tools__summary">{t('labs.results.more')}</summary>
                <div className="labs-tools__body mt-3">
                  {audit.previews && audit.previews.length > 0 ? (
                    <article className="admin-panel p-4">
                      <h3 className="font-display text-base font-semibold">{t('preview.section')}</h3>
                      <p className="mt-1 text-sm text-[var(--os-muted)]">{t('preview.auditHint')}</p>
                      <div className="mt-4 space-y-6">
                        {audit.previews.map((p) => (
                          <div key={p.url}>
                            <div className="mb-2 min-w-0">
                              <AnalyzeUrl url={p.url} compact preferPage={false} />
                            </div>
                            <PreviewCards data={p} />
                          </div>
                        ))}
                      </div>
                    </article>
                  ) : null}

                  {audit.serp ? (
                    <article className="admin-panel p-4">
                      <SerpResultsView serp={audit.serp} />
                    </article>
                  ) : null}

                  {audit.shadowRisk ? <ShadowRiskCard analysis={audit.shadowRisk} /> : null}
                  {audit.recommendations ? (
                    <ReportRecommendationsList items={audit.recommendations} />
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>

      {tab === 'mentions' || tab === 'sitemap' || tab === 'outbound' ? (
        <div
          id={`panel-pane-${tab}`}
          role="tabpanel"
          aria-labelledby={`panel-tab-${tab}`}
          className="panel-tabs__pane flex flex-col gap-4"
        >
          <SliceAToolsPanel tool={tab} />
          {tab === 'sitemap' ? (
            <article className="admin-panel p-4">
              <h3 className="font-display text-lg font-medium">{t('labs.sitemap.title')}</h3>
              <p className="mt-1 text-sm text-[var(--os-muted)]">{t('labs.sitemap.body')}</p>
              <Button
                className="mt-4"
                variant="secondary"
                isDisabled={busy}
                onPress={async () => {
                  setBusy(true);
                  setMessage(null);
                  const result = await window.openspider.exportSitemap();
                  setBusy(false);
                  setMessage('path' in result ? result.path : result.error);
                }}
              >
                {t('labs.sitemap.cta')}
              </Button>
              {message && tab === 'sitemap' ? (
                <p className="mt-3 text-sm text-[var(--os-muted)]">{message}</p>
              ) : null}
            </article>
          ) : null}
        </div>
      ) : null}

      <div
        id="panel-pane-custom"
        role="tabpanel"
        aria-labelledby="panel-tab-custom"
        hidden={tab !== 'custom'}
        className="panel-tabs__pane"
      >
        <CustomToolsPanel />
      </div>

      <div
        id="panel-pane-indexnow"
        role="tabpanel"
        aria-labelledby="panel-tab-indexnow"
        hidden={tab !== 'indexnow'}
        className="panel-tabs__pane flex flex-col gap-4"
      >
        <article className="admin-panel p-4">
          <h3 className="font-display text-lg font-medium">{t('labs.indexnow.title')}</h3>
          <p className="mt-1 text-sm text-[var(--os-muted)]">{t('labs.indexnow.body')}</p>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <TextField
              className="min-w-[220px] flex-1"
              value={indexNowKey}
              onChange={setIndexNowKey}
            >
              <Label>{t('labs.indexnow.key')}</Label>
              <Input data-testid="labs-indexnow-key" />
            </TextField>
            <Button
              variant="secondary"
              isDisabled={busy}
              onPress={() => {
                const key = Array.from(crypto.getRandomValues(new Uint8Array(16)))
                  .map((b) => b.toString(16).padStart(2, '0'))
                  .join('');
                setIndexNowKey(key);
              }}
            >
              {t('labs.indexnow.gen')}
            </Button>
            <Button
              variant="secondary"
              isDisabled={busy || !indexNowKey.trim()}
              onPress={async () => {
                setBusy(true);
                setMessage(null);
                try {
                  const result = await window.openspider.downloadIndexNowKey(indexNowKey.trim());
                  if (result.ok) {
                    setIndexNowKey(result.key);
                    setMessage(t('labs.indexnow.downloaded', { path: result.path }));
                  }
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('labs.indexnow.download')}
            </Button>
            <Button
              variant="primary"
              isDisabled={busy || !indexNowKey.trim()}
              onPress={async () => {
                setBusy(true);
                setMessage(null);
                try {
                  await window.openspider.saveSecrets({ indexNowKey: indexNowKey.trim() });
                  const result = await window.openspider.submitIndexNow(indexNowKey.trim());
                  setMessage(
                    result.ok
                      ? t('labs.indexnow.ok', {
                          count: result.submitted,
                          host: result.host,
                          hint: result.keyFileHint,
                        })
                      : result.error ?? 'IndexNow failed',
                  );
                } catch (err) {
                  setMessage(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('labs.indexnow.cta')}
            </Button>
          </div>
          {message && tab === 'indexnow' ? (
            <p className="mt-3 text-sm text-[var(--os-muted)]">{message}</p>
          ) : null}
        </article>

        <article className="admin-panel p-4">
          <h3 className="font-display text-lg font-medium">{t('labs.credits.title')}</h3>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-[var(--os-muted)]">
            {credits.map((c) => (
              <li key={c.package}>
                {c.package} · {c.license}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
});
