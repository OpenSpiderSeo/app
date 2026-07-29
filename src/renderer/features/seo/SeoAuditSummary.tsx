import { memo, useMemo, useState } from 'react';
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
import { issueFixHowKey, issueFixTitleKey } from '../../i18n/issue-fix-keys';
import type { MessageKey } from '../../i18n/translate';
import { PanelTabs } from '../../components/PanelTabs';

type SeoTabId = 'problems' | 'index' | 'onpage' | 'quality';

interface SeoAuditSummaryProps {
  pages: CrawledPage[];
  issues: SeoIssue[];
  onSelectIssueCode?: (code: string) => void;
  /** Compact: score + top issues only (for crawl details). */
  compact?: boolean;
}

interface RankedRow {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: SeoMetricTone;
  /** Lower = worse (sort key). */
  rank: number;
  issueCode?: string;
  fixTeaser?: string;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return '—';
  return `${Math.round((part / whole) * 100)}%`;
}

function toneRank(tone: SeoMetricTone): number {
  return tone === 'bad' ? 0 : tone === 'warn' ? 1 : 2;
}

function severityRank(severity: string): number {
  return severity === 'error' ? 0 : severity === 'warning' ? 1 : 2;
}

function issueHumanLabel(t: (key: MessageKey) => string, code: string): string {
  const key = issueFixTitleKey(code as IssueCodeName);
  const label = t(key);
  return label === key ? code : label;
}

function fixTeaser(t: (key: MessageKey) => string, code: string): string {
  const how = t(issueFixHowKey(code as IssueCodeName));
  if (!how || how.startsWith('fix.')) return '';
  const line = how.split('\n').map((s) => s.trim()).find(Boolean) ?? '';
  return line.length > 110 ? `${line.slice(0, 107)}…` : line;
}

function sortRows(rows: RankedRow[]): RankedRow[] {
  return [...rows].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
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
  const [tab, setTab] = useState<SeoTabId>('problems');
  const clickable = Boolean(onSelectIssueCode);

  const problemRows = useMemo<RankedRow[]>(() => {
    return metrics.topIssueCodes.map((item, index) => ({
      id: item.code,
      label: issueHumanLabel(t, item.code),
      value: String(item.count),
      hint: item.code,
      tone: item.severity === 'error' ? 'bad' : item.severity === 'warning' ? 'warn' : 'ok',
      rank: severityRank(item.severity) * 1000 - item.count + index * 0.01,
      issueCode: item.code,
      fixTeaser: fixTeaser(t, item.code),
    }));
  }, [metrics.topIssueCodes, t]);

  const metricGroups = useMemo(() => {
    const base = metrics.okPages || pages.length;
    const coverage = (have: number) => pctFromPart(have, base) ?? 0;

    const index: RankedRow[] = sortRows([
      {
        id: 'indexable',
        label: t('seoSummary.indexable'),
        value: `${metrics.indexablePages}/${base}`,
        hint: pct(metrics.indexablePages, base),
        tone: pctCoverageTone(coverage(metrics.indexablePages)),
        rank: toneRank(pctCoverageTone(coverage(metrics.indexablePages))) * 100 + (100 - coverage(metrics.indexablePages)),
      },
      {
        id: 'noindex',
        label: t('seoSummary.noindex'),
        value: String(metrics.noindexPages),
        hint: pct(metrics.noindexPages, base),
        tone: countProblemTone(metrics.noindexPages, base),
        rank: toneRank(countProblemTone(metrics.noindexPages, base)) * 100 + metrics.noindexPages,
        issueCode: metrics.noindexPages > 0 ? IssueCode.Noindex : undefined,
      },
      {
        id: 'soft404',
        label: t('seoSummary.soft404'),
        value: String(metrics.soft404Pages),
        hint: metrics.soft404Pages > 0 ? t('seoSummary.soft404Hint') : undefined,
        tone: countProblemTone(metrics.soft404Pages, base),
        rank: toneRank(countProblemTone(metrics.soft404Pages, base)) * 100 + metrics.soft404Pages,
        issueCode: metrics.soft404Pages > 0 ? IssueCode.Soft404 : undefined,
      },
      {
        id: 'canonical',
        label: t('seoSummary.canonical'),
        value: pct(metrics.withCanonical, base),
        tone: pctCoverageTone(coverage(metrics.withCanonical)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withCanonical))) * 100 + (100 - coverage(metrics.withCanonical)),
        issueCode: IssueCode.MissingCanonical,
      },
    ]);

    const onpage: RankedRow[] = sortRows([
      {
        id: 'head',
        label: t('seoSummary.headScore'),
        value: head.avgScore == null ? '—' : String(head.avgScore),
        hint: t('seoSummary.headHint', { count: head.pagesScored }),
        tone: scoreTone(head.avgScore) ?? 'ok',
        rank: toneRank(scoreTone(head.avgScore) ?? 'ok') * 100 + (100 - (head.avgScore ?? 100)),
      },
      {
        id: 'title',
        label: t('seoSummary.titles'),
        value: pct(metrics.withTitle, base),
        hint: `${metrics.withTitle} · avg ${metrics.avgTitleLength ?? '—'} ${t('seoSummary.chars')}`,
        tone: pctCoverageTone(coverage(metrics.withTitle)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withTitle))) * 100 + (100 - coverage(metrics.withTitle)),
        issueCode: IssueCode.MissingTitle,
      },
      {
        id: 'desc',
        label: t('seoSummary.descriptions'),
        value: pct(metrics.withDescription, base),
        hint: `${metrics.withDescription} · avg ${metrics.avgDescriptionLength ?? '—'} ${t('seoSummary.chars')}`,
        tone: pctCoverageTone(coverage(metrics.withDescription)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withDescription))) * 100 + (100 - coverage(metrics.withDescription)),
        issueCode: IssueCode.MissingMetaDescription,
      },
      {
        id: 'h1',
        label: t('seoSummary.h1'),
        value: pct(metrics.withH1, base),
        tone: pctCoverageTone(coverage(metrics.withH1)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withH1))) * 100 + (100 - coverage(metrics.withH1)),
        issueCode: IssueCode.MissingH1,
      },
      {
        id: 'htmlLang',
        label: t('seoSummary.htmlLang'),
        value: pct(metrics.withHtmlLang, base),
        tone: pctCoverageTone(coverage(metrics.withHtmlLang)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withHtmlLang))) * 100 + (100 - coverage(metrics.withHtmlLang)),
        issueCode: IssueCode.MissingHtmlLang,
      },
      {
        id: 'hreflang',
        label: t('seoSummary.hreflang'),
        value: pct(metrics.withHreflang, base),
        tone: pctCoverageTone(coverage(metrics.withHreflang)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withHreflang))) * 100 + (100 - coverage(metrics.withHreflang)),
        issueCode: IssueCode.MissingHreflang,
      },
      {
        id: 'jsonld',
        label: t('seoSummary.jsonld'),
        value: pct(metrics.withJsonLd, base),
        tone: pctCoverageTone(coverage(metrics.withJsonLd)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withJsonLd))) * 100 + (100 - coverage(metrics.withJsonLd)),
        issueCode: IssueCode.MissingJsonLd,
      },
      {
        id: 'viewport',
        label: t('seoSummary.viewport'),
        value: pct(metrics.withViewport, base),
        tone: pctCoverageTone(coverage(metrics.withViewport)),
        rank: toneRank(pctCoverageTone(coverage(metrics.withViewport))) * 100 + (100 - coverage(metrics.withViewport)),
        issueCode: IssueCode.MissingViewport,
      },
    ]);

    const quality: RankedRow[] = sortRows([
      {
        id: 'dupTitles',
        label: t('seoSummary.dupTitles'),
        value: String(metrics.duplicateTitlePages),
        hint: pct(metrics.duplicateTitlePages, base),
        tone: countProblemTone(metrics.duplicateTitlePages, base),
        rank: toneRank(countProblemTone(metrics.duplicateTitlePages, base)) * 100 + metrics.duplicateTitlePages,
        issueCode: metrics.duplicateTitlePages > 0 ? IssueCode.DuplicateTitle : undefined,
      },
      {
        id: 'dupDesc',
        label: t('seoSummary.dupDescriptions'),
        value: String(metrics.duplicateDescriptionPages),
        hint: pct(metrics.duplicateDescriptionPages, base),
        tone: countProblemTone(metrics.duplicateDescriptionPages, base),
        rank: toneRank(countProblemTone(metrics.duplicateDescriptionPages, base)) * 100 + metrics.duplicateDescriptionPages,
        issueCode: metrics.duplicateDescriptionPages > 0 ? IssueCode.DuplicateMetaDescription : undefined,
      },
      {
        id: 'alt',
        label: t('seoSummary.altGaps'),
        value: String(metrics.missingAltImages),
        tone: countProblemTone(metrics.missingAltImages),
        rank: toneRank(countProblemTone(metrics.missingAltImages)) * 100 + metrics.missingAltImages,
        issueCode: metrics.missingAltImages > 0 ? IssueCode.ImagesMissingAlt : undefined,
      },
      {
        id: 'content',
        label: t('seoSummary.contentScore'),
        value: metrics.contentScore == null ? '—' : String(metrics.contentScore),
        tone: scoreTone(metrics.contentScore) ?? 'ok',
        rank: toneRank(scoreTone(metrics.contentScore) ?? 'ok') * 100 + (100 - (metrics.contentScore ?? 100)),
        issueCode: IssueCode.ThinContent,
      },
    ]);

    const withFix = (row: RankedRow): RankedRow =>
      row.issueCode ? { ...row, fixTeaser: fixTeaser(t, row.issueCode) } : row;

    return {
      index: index.map(withFix),
      onpage: onpage.map(withFix),
      quality: quality.map(withFix),
    };
  }, [metrics, pages.length, head, t]);

  if (pages.length === 0) {
    return (
      <div className="admin-panel p-4 text-sm text-[var(--os-muted)]">{t('seoSummary.empty')}</div>
    );
  }

  const tabs = [
    { id: 'problems' as const, label: t('seoSummary.tab.problems') },
    { id: 'index' as const, label: t('seoSummary.group.index') },
    { id: 'onpage' as const, label: t('seoSummary.group.onpage') },
    { id: 'quality' as const, label: t('seoSummary.group.quality') },
  ];

  const activeRows =
    tab === 'problems'
      ? problemRows
      : tab === 'index'
        ? metricGroups.index
        : tab === 'onpage'
          ? metricGroups.onpage
          : metricGroups.quality;

  const openRow = (row: RankedRow) => {
    if (!row.issueCode || !onSelectIssueCode) return;
    onSelectIssueCode(row.issueCode);
  };

  return (
    <div className={`seo-summary admin-panel${compact ? ' seo-summary--compact' : ''}`}>
      <div className="seo-summary__head">
        <div>
          <p className="admin-label">{t('seoSummary.label')}</p>
          <h2 className="seo-summary__title">{t('seoSummary.title')}</h2>
          {!compact ? (
            <p className="seo-summary__sub">{t('seoSummary.subtitle')}</p>
          ) : null}
          {clickable ? (
            <p className="seo-summary__hint">{t('seoSummary.clickHint')}</p>
          ) : null}
        </div>
        <div className={`seo-summary__score${healthBand ? ` seo-summary__score--${healthBand}` : ''}`}>
          <span className="seo-summary__score-val">{metrics.healthScore}</span>
          <span className="seo-summary__score-label">{t('seoSummary.health')}</span>
        </div>
      </div>

      {!compact ? (
        <PanelTabs
          ariaLabel={t('seoSummary.tabsLabel')}
          tabs={tabs}
          active={tab}
          onChange={setTab}
          className="seo-summary__tabs"
        />
      ) : null}

      <div className="seo-summary__rank" role="list">
        {(compact ? problemRows.slice(0, 6) : activeRows).length === 0 ? (
          <p className="text-sm text-[var(--os-muted)]">{t('seoSummary.noIssues')}</p>
        ) : (
          (compact ? problemRows.slice(0, 6) : activeRows).map((row, i) => {
            const canOpen = Boolean(clickable && row.issueCode);
            const body = (
              <>
                <span className="seo-summary__row-pos font-mono">{i + 1}</span>
                <span className="seo-summary__row-main">
                  <span className="seo-summary__row-label">{row.label}</span>
                  {row.fixTeaser ? (
                    <span className="seo-summary__row-fix">{row.fixTeaser}</span>
                  ) : row.hint ? (
                    <span className="seo-summary__row-hint">{row.hint}</span>
                  ) : null}
                </span>
                <span className="seo-summary__row-value font-mono">{row.value}</span>
                {canOpen ? (
                  <span className="seo-summary__row-cta">{t('seoSummary.fixCta')}</span>
                ) : null}
              </>
            );
            if (canOpen) {
              return (
                <button
                  key={row.id}
                  type="button"
                  role="listitem"
                  className={`seo-summary__row seo-summary__row--${row.tone} is-clickable`}
                  onClick={() => openRow(row)}
                >
                  {body}
                </button>
              );
            }
            return (
              <div
                key={row.id}
                role="listitem"
                className={`seo-summary__row seo-summary__row--${row.tone}`}
              >
                {body}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
