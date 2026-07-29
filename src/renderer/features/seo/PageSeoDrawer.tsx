import { memo, useMemo } from 'react';
import { pageH1, pageHreflang, pageMetaDescription, pageTitle } from '../../../shared/utils/crawl-state.utils';
import type { CrawledPage, SeoIssue } from '../../../shared/types/crawl.types';
import { pageIndexLabel } from '../../../shared/utils/seo-audit.utils';
import { scorePageContent } from '../../../shared/utils/content-score.utils';
import { scoreHeadChecklist } from '../../../shared/utils/head-checklist.utils';
import { useI18n } from '../../i18n/I18nProvider';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { openIssuesFiltered } from '../../lib/analyze-nav';
import { openInBrowser } from '../../lib/open-external';
import type { NavSectionName } from '../../app/routes.const';
import { buildPagePreview } from '../../../shared/utils/page-preview.utils';
import { PreviewCards } from '../preview/PreviewCards';

interface PageSeoDrawerProps {
  page: CrawledPage | null;
  issues?: SeoIssue[];
  onClose: () => void;
  onViewAsGoogle?: (url: string) => void;
  onNavigate?: (section: NavSectionName) => void;
}

function Row({
  label,
  value,
  url,
  onNavigate,
}: {
  label: string;
  value: string;
  url?: string | null;
  onNavigate?: (section: NavSectionName) => void;
}) {
  return (
    <div className="page-seo__row">
      <dt>{label}</dt>
      <dd>
        {url ? (
          <AnalyzeUrl url={url} compact preferPage={false} onNavigate={onNavigate} />
        ) : (
          value || '—'
        )}
      </dd>
    </div>
  );
}

export const PageSeoDrawer = memo(function PageSeoDrawer({
  page,
  issues = [],
  onClose,
  onViewAsGoogle,
  onNavigate,
}: PageSeoDrawerProps) {
  const { t } = useI18n();
  const pageIssues = useMemo(
    () => (page ? issues.filter((i) => i.url === page.url) : []),
    [issues, page],
  );
  const content = useMemo(() => (page ? scorePageContent(page) : null), [page]);
  const head = useMemo(() => (page ? scoreHeadChecklist(page) : null), [page]);
  const preview = useMemo(() => (page ? buildPagePreview(page) : null), [page]);
  if (!page) return null;

  const index = pageIndexLabel(page);
  const titleLen = pageTitle(page).length;
  const descLen = pageMetaDescription(page).length;

  return (
    <aside className="page-seo admin-panel" aria-label={t('pageSeo.title')}>
      <header className="page-seo__head">
        <div className="min-w-0 flex-1">
          <p className="admin-label">{t('pageSeo.title')}</p>
          <div className="page-seo__url-block">
            <AnalyzeUrl url={page.url} compact onNavigate={onNavigate} preferPage={false} />
          </div>
        </div>
        <button type="button" className="page-seo__close" onClick={onClose}>
          ✕
        </button>
      </header>

      <div className="page-seo__scroll os-scroll">
      <div className="page-seo__chips">
        <span className={`page-seo__chip is-${index}`}>{t(`pageSeo.index.${index}`)}</span>
        <span className="page-seo__chip">HTTP {page.statusCode || '—'}</span>
        {page.rendered ? <span className="page-seo__chip">JS render</span> : null}
        {page.segment ? <span className="page-seo__chip">{page.segment}</span> : null}
      </div>

      <div className="page-seo__actions">
        {onViewAsGoogle ? (
          <button
            type="button"
            className="crawl-googlebot-btn"
            onClick={() => onViewAsGoogle(page.url)}
          >
            {t('crawl.viewGooglebot')}
          </button>
        ) : null}
        <button
          type="button"
          className="os-btn os-btn--ghost crawl-googlebot-btn"
          onClick={() => void openInBrowser(page.url)}
        >
          {t('analyze.openBrowser')}
        </button>
      </div>

      {content ? (
        <div className="page-seo__chips">
          <span className="page-seo__chip">
            {t('pageSeo.field.contentScore')}: {content.score}
          </span>
          {head ? (
            <span className="page-seo__chip">
              {t('pageSeo.field.headScore')}: {head.score}
            </span>
          ) : null}
          {content.flesch != null ? (
            <span className="page-seo__chip">Flesch {content.flesch}</span>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="page-seo__previews">
          <p className="admin-label">{t('preview.section')}</p>
          <PreviewCards data={preview} compact />
        </div>
      ) : null}

      <dl className="page-seo__dl">
        <Row label={t('pageSeo.field.title')} value={pageTitle(page)} />
        <Row
          label={t('pageSeo.field.titleLen')}
          value={titleLen ? `${titleLen} ${t('seoSummary.chars')}` : '—'}
        />
        <Row label={t('pageSeo.field.description')} value={pageMetaDescription(page)} />
        <Row
          label={t('pageSeo.field.descLen')}
          value={descLen ? `${descLen} ${t('seoSummary.chars')}` : '—'}
        />
        <Row label="H1" value={pageH1(page).join(' | ')} />
        <Row label="H2" value={String(page.h2Count)} />
        <Row
          label={t('pageSeo.field.canonical')}
          value={page.canonical ?? ''}
          url={page.canonical}
          onNavigate={onNavigate}
        />
        <Row label={t('pageSeo.field.robots')} value={page.robotsMeta ?? ''} />
        <Row label={t('pageSeo.field.htmlLang')} value={page.htmlLang ?? ''} />
        <Row label={t('pageSeo.field.detectedLang')} value={page.language ?? ''} />
        {pageHreflang(page).length > 0 ? (
          <div className="page-seo__row page-seo__row--stack">
            <dt>{t('pageSeo.field.hreflang')}</dt>
            <dd className="space-y-1">
              {pageHreflang(page).map((h) => (
                <div key={`${h.lang}-${h.href}`} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{h.lang}</span>
                  <AnalyzeUrl url={h.href} compact preferPage onNavigate={onNavigate} />
                </div>
              ))}
            </dd>
          </div>
        ) : (
          <Row label={t('pageSeo.field.hreflang')} value="" />
        )}
        <Row label={t('pageSeo.field.ogTitle')} value={page.ogTitle ?? ''} />
        <Row
          label={t('pageSeo.field.ogImage')}
          value={page.ogImage ?? ''}
          url={preview?.socialImage ?? page.ogImage}
          onNavigate={onNavigate}
        />
        <Row label="Twitter Card" value={page.twitterCard ?? ''} />
        <Row
          label="JSON-LD"
          value={
            page.jsonLdCount
              ? `${page.jsonLdCount}: ${(page.jsonLdTypes ?? []).join(', ') || '—'}`
              : ''
          }
        />
        <Row label={t('pageSeo.field.words')} value={String(page.wordCount)} />
        <Row
          label={t('pageSeo.field.images')}
          value={`${page.imagesTotal} · alt− ${page.imagesMissingAlt}`}
        />
        <Row label={t('pageSeo.field.viewport')} value={page.hasViewport ? 'yes' : 'no'} />
        <Row label={t('pageSeo.field.depth')} value={String(page.depth)} />
        <Row
          label={t('pageSeo.field.links')}
          value={`in ${page.inlinks} · out ${page.outlinks}`}
        />
        <Row
          label={t('pageSeo.field.redirect')}
          value={page.redirectUrl ?? ''}
          url={page.redirectUrl}
          onNavigate={onNavigate}
        />
        <Row label={t('pageSeo.field.contentType')} value={page.contentType ?? ''} />
        <Row label={t('pageSeo.field.excerpt')} value={page.excerpt ?? ''} />
        <Row
          label={t('pageSeo.field.keywords')}
          value={page.topKeywords?.join(', ') ?? ''}
        />
        {page.error ? <Row label={t('pageSeo.field.error')} value={page.error} /> : null}
      </dl>

      {pageIssues.length > 0 ? (
        <div className="page-seo__issues">
          <p className="admin-label">{t('pageSeo.issues')}</p>
          <ul className="page-seo__issue-list">
            {pageIssues.map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  className={`page-seo__issue sev-${issue.severity} is-clickable`}
                  onClick={() => openIssuesFiltered(issue.code, onNavigate)}
                >
                  <span className="page-seo__issue-sev">{issue.severity}</span>
                  <span className="page-seo__issue-code">{issue.code}</span>
                  <span className="page-seo__issue-msg">{issue.message}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      </div>
    </aside>
  );
});
