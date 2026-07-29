import { memo, useMemo, type ReactNode } from 'react';
import type { CrawledPage, SeoIssue } from '../../../shared/types/crawl.types';
import { IssueCode, type IssueCodeName } from '../../../shared/types/crawl.types';
import { healthBandFromScore } from '../../../shared/utils/honor-rank.utils';
import { buildSeoAuditMetrics } from '../../../shared/utils/seo-audit.utils';
import {
  countProblemTone,
  pctCoverageTone,
  pctFromPart,
  scoreTone,
  type SeoMetricTone,
} from './seo-metric-tone.utils';
import { averageHeadScore } from '../../../shared/utils/head-checklist.utils';
import { useI18n } from '../../i18n/I18nProvider';
import { issueFixTitleKey } from '../../i18n/issue-fix-keys';
import type { MessageKey } from '../../i18n/translate';

interface SeoAuditSummaryProps {
  pages: CrawledPage[];
  issues: SeoIssue[];
  onSelectIssueCode?: (code: string) => void;
  /** Compact: score + top issues only (for crawl details). */
  compact?: boolean;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function issueHumanLabel(t: (key: MessageKey) => string, code: string): string {
  const key = issueFixTitleKey(code as IssueCodeName);
  const label = t(key);
  return label === key ? code : label;
}

export const SeoAuditSummary = memo(function SeoAuditSummary({
  pages,
  issues,
  onSelectIssueCode,
  compact = false,
}: SeoAuditSummaryProps) {
  const { t } = useI18n();
  const metrics = useMemo(() => buildSeoAuditMetrics(pages, issues), [pages, issues]);
  const head = useMemo(() => averageHeadScore(pages), [pages]);
  const healthBand = healthBandFromScore(metrics.healthScore);

  if (pages.length === 0) {
    return (
      <div className="admin-panel p-4 text-sm text-[var(--os-muted)]">{t('seoSummary.empty')}</div>
    );
  }

  const base = metrics.okPages || pages.length;
  const topHeadGaps = head.failRateById.filter((x) => x.failPct > 0).slice(0, 5);
  const clickable = Boolean(onSelectIssueCode);

  if (compact) {
    return (
      <div className="seo-summary seo-summary--compact admin-panel">
        <div className="seo-summary__head">
          <div>
            <p className="admin-label">{t('seoSummary.label')}</p>
            <h2 className="seo-summary__title">{t('seoSummary.title')}</h2>
          </div>
          <div className={`seo-summary__score${healthBand ? ` seo-summary__score--${healthBand}` : ''}`}>
            <span className="seo-summary__score-val">{metrics.healthScore}</span>
            <span className="seo-summary__score-label">{t('seoSummary.health')}</span>
          </div>
        </div>
        <div className="seo-summary__issues">
          <p className="admin-label">{t('seoSummary.topIssues')}</p>
          {metrics.topIssueCodes.length === 0 ? (
            <p className="text-sm text-[var(--os-muted)]">{t('seoSummary.noIssues')}</p>
          ) : (
            <ul className="seo-summary__issue-list">
              {metrics.topIssueCodes.slice(0, 5).map((item) => (
                <li key={item.code}>
                  <button
                    type="button"
                    className={`seo-summary__issue sev-${item.severity}`}
                    onClick={() => onSelectIssueCode?.(item.code)}
                    disabled={!onSelectIssueCode}
                  >
                    <span className="seo-summary__issue-count">{item.count}</span>
                    <span className="seo-summary__issue-body">
                      <span className="seo-summary__issue-label">
                        {issueHumanLabel(t, item.code)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const canonicalPct = pctFromPart(metrics.withCanonical, base) ?? 0;
  const titlePct = pctFromPart(metrics.withTitle, base) ?? 0;
  const descPct = pctFromPart(metrics.withDescription, base) ?? 0;
  const h1Pct = pctFromPart(metrics.withH1, base) ?? 0;
  const htmlLangPct = pctFromPart(metrics.withHtmlLang, base) ?? 0;
  const hreflangPct = pctFromPart(metrics.withHreflang, base) ?? 0;
  const jsonldPct = pctFromPart(metrics.withJsonLd, base) ?? 0;
  const viewportPct = pctFromPart(metrics.withViewport, base) ?? 0;
  const indexablePct = pctFromPart(metrics.indexablePages, base) ?? 0;

  return (
    <div className="seo-summary admin-panel">
      <div className="seo-summary__head">
        <div>
          <p className="admin-label">{t('seoSummary.label')}</p>
          <h2 className="seo-summary__title">{t('seoSummary.title')}</h2>
          <p className="seo-summary__sub">{t('seoSummary.subtitle')}</p>
          <p className="seo-summary__how">{t('seoSummary.howItWorks')}</p>
          {clickable ? (
            <p className="seo-summary__hint">{t('seoSummary.clickHint')}</p>
          ) : null}
        </div>
        <div className={`seo-summary__score${healthBand ? ` seo-summary__score--${healthBand}` : ''}`}>
          <span className="seo-summary__score-val">{metrics.healthScore}</span>
          <span className="seo-summary__score-label">{t('seoSummary.health')}</span>
        </div>
      </div>

      <div className="seo-summary__issues">
        <p className="admin-label">{t('seoSummary.topIssues')}</p>
        {metrics.topIssueCodes.length === 0 ? (
          <p className="text-sm text-[var(--os-muted)]">{t('seoSummary.noIssues')}</p>
        ) : (
          <ul className="seo-summary__issue-list">
            {metrics.topIssueCodes.map((item) => (
              <li key={item.code}>
                <button
                  type="button"
                  className={`seo-summary__issue sev-${item.severity}`}
                  onClick={() => onSelectIssueCode?.(item.code)}
                  disabled={!onSelectIssueCode}
                >
                  <span className="seo-summary__issue-count">{item.count}</span>
                  <span className="seo-summary__issue-body">
                    <span className="seo-summary__issue-label">
                      {issueHumanLabel(t, item.code)}
                    </span>
                    <span className="seo-summary__issue-code">{item.code}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="seo-summary__metrics">
        <Group titleKey="seoSummary.group.index">
          <Metric
            label={t('seoSummary.indexable')}
            value={`${metrics.indexablePages}/${base}`}
            hint={pct(metrics.indexablePages, base)}
            tone={pctCoverageTone(indexablePct)}
          />
          <Metric
            label={t('seoSummary.noindex')}
            value={String(metrics.noindexPages)}
            hint={pct(metrics.noindexPages, base)}
            tone={countProblemTone(metrics.noindexPages, base)}
            onClick={
              clickable && metrics.noindexPages > 0
                ? () => onSelectIssueCode?.(IssueCode.Noindex)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.soft404')}
            value={String(metrics.soft404Pages)}
            hint={metrics.soft404Pages > 0 ? t('seoSummary.soft404Hint') : undefined}
            tone={countProblemTone(metrics.soft404Pages, base)}
            onClick={
              clickable && metrics.soft404Pages > 0
                ? () => onSelectIssueCode?.(IssueCode.Soft404)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.canonical')}
            value={pct(metrics.withCanonical, base)}
            tone={pctCoverageTone(canonicalPct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingCanonical) : undefined
            }
          />
        </Group>

        <Group titleKey="seoSummary.group.onpage">
          <Metric
            label={t('seoSummary.headScore')}
            value={head.avgScore == null ? '—' : String(head.avgScore)}
            hint={t('seoSummary.headHint', { count: head.pagesScored })}
            tone={scoreTone(head.avgScore) ?? undefined}
          />
          <Metric
            label={t('seoSummary.titles')}
            value={pct(metrics.withTitle, base)}
            hint={`${metrics.withTitle} · avg ${metrics.avgTitleLength ?? '—'} ${t('seoSummary.chars')}`}
            tone={pctCoverageTone(titlePct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingTitle) : undefined
            }
          />
          <Metric
            label={t('seoSummary.descriptions')}
            value={pct(metrics.withDescription, base)}
            hint={`${metrics.withDescription} · avg ${metrics.avgDescriptionLength ?? '—'} ${t('seoSummary.chars')}`}
            tone={pctCoverageTone(descPct)}
            onClick={
              clickable
                ? () => onSelectIssueCode?.(IssueCode.MissingMetaDescription)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.h1')}
            value={pct(metrics.withH1, base)}
            tone={pctCoverageTone(h1Pct)}
            onClick={clickable ? () => onSelectIssueCode?.(IssueCode.MissingH1) : undefined}
          />
          <Metric
            label={t('seoSummary.htmlLang')}
            value={pct(metrics.withHtmlLang, base)}
            tone={pctCoverageTone(htmlLangPct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingHtmlLang) : undefined
            }
          />
          <Metric
            label={t('seoSummary.hreflang')}
            value={pct(metrics.withHreflang, base)}
            tone={pctCoverageTone(hreflangPct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingHreflang) : undefined
            }
          />
          <Metric
            label={t('seoSummary.jsonld')}
            value={pct(metrics.withJsonLd, base)}
            tone={pctCoverageTone(jsonldPct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingJsonLd) : undefined
            }
          />
          <Metric
            label={t('seoSummary.viewport')}
            value={pct(metrics.withViewport, base)}
            tone={pctCoverageTone(viewportPct)}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.MissingViewport) : undefined
            }
          />
        </Group>

        <Group titleKey="seoSummary.group.quality">
          <Metric
            label={t('seoSummary.dupTitles')}
            value={String(metrics.duplicateTitlePages)}
            hint={pct(metrics.duplicateTitlePages, base)}
            tone={countProblemTone(metrics.duplicateTitlePages, base)}
            onClick={
              clickable && metrics.duplicateTitlePages > 0
                ? () => onSelectIssueCode?.(IssueCode.DuplicateTitle)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.dupDescriptions')}
            value={String(metrics.duplicateDescriptionPages)}
            hint={pct(metrics.duplicateDescriptionPages, base)}
            tone={countProblemTone(metrics.duplicateDescriptionPages, base)}
            onClick={
              clickable && metrics.duplicateDescriptionPages > 0
                ? () => onSelectIssueCode?.(IssueCode.DuplicateMetaDescription)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.altGaps')}
            value={String(metrics.missingAltImages)}
            tone={countProblemTone(metrics.missingAltImages)}
            onClick={
              clickable && metrics.missingAltImages > 0
                ? () => onSelectIssueCode?.(IssueCode.ImagesMissingAlt)
                : undefined
            }
          />
          <Metric
            label={t('seoSummary.contentScore')}
            value={metrics.contentScore == null ? '—' : String(metrics.contentScore)}
            tone={scoreTone(metrics.contentScore) ?? undefined}
            onClick={
              clickable ? () => onSelectIssueCode?.(IssueCode.ThinContent) : undefined
            }
          />
        </Group>
      </div>

      {topHeadGaps.length > 0 ? (
        <div className="seo-summary__issues">
          <p className="admin-label">{t('seoSummary.headGaps')}</p>
          <ul className="seo-summary__issue-list">
            {topHeadGaps.map((item) => (
              <li key={item.id}>
                <span className="seo-summary__issue sev-warning">
                  <span className="seo-summary__issue-count">{item.failPct}%</span>
                  <span className="seo-summary__issue-code">{item.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
});

function Group({ titleKey, children }: { titleKey: MessageKey; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <p className="admin-label seo-summary__group-label">{t(titleKey)}</p>
      {children}
    </>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: SeoMetricTone;
  onClick?: () => void;
}) {
  const toneClass = tone ? ` seo-summary__metric--${tone}` : '';
  const body = (
    <>
      <div className="seo-summary__metric-head">
        <div className="seo-summary__metric-label">{label}</div>
        {tone ? <span className={`seo-summary__metric-dot seo-summary__metric-dot--${tone}`} aria-hidden /> : null}
      </div>
      <div className="seo-summary__metric-value">{value}</div>
      {hint ? <div className="seo-summary__metric-hint">{hint}</div> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={`seo-summary__metric is-clickable${toneClass}`} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={`seo-summary__metric${toneClass}`}>{body}</div>;
}
