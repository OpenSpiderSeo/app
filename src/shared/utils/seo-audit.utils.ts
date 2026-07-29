/** SEO audit rollup for specialists — coverage + top issues + content/HEAD. */
import type { CrawledPage, SeoIssue } from '../types/crawl.types';
import type { SeoAuditMetrics } from '../types/report.types';
import { hasMetaDescription, pageH1, pageHreflang, pageMetaDescription, pageTitle } from './crawl-state.utils';
import { averageContentScore } from './content-score.utils';
import { averageHeadScore } from './head-checklist.utils';
import { isHtmlContentType } from './page-audit.utils';

function isNoindex(page: CrawledPage): boolean {
  return /\bnoindex\b/i.test(page.robotsMeta ?? '');
}

function isOkHttp(page: CrawledPage): boolean {
  return !page.error && page.statusCode >= 200 && page.statusCode < 300;
}

function isOkHtml(page: CrawledPage): boolean {
  return isOkHttp(page) && isHtmlContentType(page.contentType);
}

function countDuplicateField(
  pages: CrawledPage[],
  field: 'title' | 'metaDescription',
): number {
  const map = new Map<string, number>();
  for (const p of pages) {
    if (!isOkHtml(p)) continue;
    const raw = field === 'title' ? p.title : p.metaDescription;
    const v = raw?.trim().toLowerCase();
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  let dupPages = 0;
  for (const count of map.values()) {
    if (count > 1) dupPages += count;
  }
  return dupPages;
}

export function computeHealthScore(input: {
  errors: number;
  warnings: number;
  okPages: number;
  headScore?: number | null;
  contentScore?: number | null;
}): number {
  const { errors, warnings, okPages } = input;
  let score = 100 - errors * 6 - warnings * 1.5 - (okPages === 0 ? 20 : 0);
  if (input.headScore != null) {
    score = score * 0.85 + input.headScore * 0.15;
  }
  if (input.contentScore != null) {
    score = score * 0.9 + input.contentScore * 0.1;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildSeoAuditMetrics(
  pages: CrawledPage[],
  issues: SeoIssue[],
): SeoAuditMetrics {
  const ok = pages.filter(isOkHtml);
  const noindexPages = ok.filter(isNoindex).length;
  const indexablePages = Math.max(0, ok.length - noindexPages);

  const withTitle = ok.filter((p) => Boolean(pageTitle(p))).length;
  const withDescription = ok.filter((p) => hasMetaDescription(p)).length;
  const withH1 = ok.filter((p) => pageH1(p).length > 0).length;
  const withCanonical = ok.filter((p) => Boolean(p.canonical)).length;
  const withHtmlLang = ok.filter((p) => Boolean(p.htmlLang)).length;
  const withHreflang = ok.filter((p) => pageHreflang(p).length > 0).length;
  const withJsonLd = ok.filter((p) => p.jsonLdCount > 0).length;
  const withViewport = ok.filter((p) => p.hasViewport).length;
  const missingAltImages = ok.reduce((n, p) => n + (p.imagesMissingAlt || 0), 0);
  const duplicateTitlePages = countDuplicateField(ok, 'title');
  const duplicateDescriptionPages = countDuplicateField(ok, 'metaDescription');
  const soft404Pages = ok.filter(isSoft404Suspect).length;

  const titleLens = ok
    .map((p) => pageTitle(p).length)
    .filter((n) => n > 0);
  const descLens = ok
    .map((p) => pageMetaDescription(p).length)
    .filter((n) => n > 0);

  const byCode = new Map<string, { code: string; count: number; severity: string }>();
  for (const issue of issues) {
    const prev = byCode.get(issue.code);
    if (prev) prev.count += 1;
    else byCode.set(issue.code, { code: issue.code, count: 1, severity: issue.severity });
  }
  const severityRank = (s: string) => (s === 'error' ? 0 : s === 'warning' ? 1 : 2);
  const topIssueCodes = [...byCode.values()]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.count - a.count)
    .slice(0, 12);

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const head = averageHeadScore(pages);
  const contentScore = averageContentScore(pages);
  const healthScore = computeHealthScore({
    errors,
    warnings,
    okPages: ok.length,
    headScore: head.avgScore,
    contentScore,
  });

  return {
    okPages: ok.length,
    indexablePages,
    noindexPages,
    withTitle,
    withDescription,
    withH1,
    withCanonical,
    withHtmlLang,
    withHreflang,
    withJsonLd,
    withViewport,
    missingAltImages,
    duplicateTitlePages,
    duplicateDescriptionPages,
    soft404Pages,
    headScore: head.avgScore,
    contentScore,
    avgTitleLength:
      titleLens.length === 0
        ? null
        : Math.round(titleLens.reduce((a, b) => a + b, 0) / titleLens.length),
    avgDescriptionLength:
      descLens.length === 0
        ? null
        : Math.round(descLens.reduce((a, b) => a + b, 0) / descLens.length),
    topIssueCodes,
    healthScore,
  };
}

export function isSoft404Suspect(page: CrawledPage): boolean {
  if (!isOkHtml(page)) return false;
  const blob = `${pageTitle(page)} ${pageH1(page).join(' ')} ${page.excerpt ?? ''}`.toLowerCase();
  const looksMissing =
    /\b404\b/.test(blob) ||
    /not found|page not found|страница не найдена|не найдена|does not exist|ничего не найдено/i.test(
      blob,
    );
  if (!looksMissing) return false;
  return page.wordCount < 250 || pageH1(page).length === 0;
}

export function isPageIndexable(page: CrawledPage): boolean {
  return isOkHttp(page) && !isNoindex(page);
}

export function pageIndexLabel(page: CrawledPage): 'index' | 'noindex' | 'blocked' {
  if (page.error || page.statusCode >= 400) return 'blocked';
  if (page.statusCode >= 300 && page.statusCode < 400) return 'blocked';
  if (isNoindex(page)) return 'noindex';
  return 'index';
}
