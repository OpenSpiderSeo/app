/** SERP + social share preview payloads from crawled page fields. */
import type { CrawledPage } from '../types/crawl.types';
import type { PagePreviewData } from '../types/preview.types';
import { normalizeUrl } from './url.utils';

type PreviewSource = Pick<
  CrawledPage,
  | 'url'
  | 'title'
  | 'metaDescription'
  | 'ogTitle'
  | 'ogImage'
  | 'ogImageOnly'
  | 'twitterImage'
  | 'excerpt'
>;

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function decodePreviewImageRaw(raw: string): string {
  return raw
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/** Resolve og/twitter image meta to an absolute http(s) URL against the page URL. */
export function resolvePreviewImageUrl(
  raw: string | null | undefined,
  pageUrl: string,
): string | null {
  const trimmed = decodePreviewImageRaw(raw?.trim() ?? '');
  if (!trimmed) return null;

  const normalized = normalizeUrl(trimmed, pageUrl);
  if (normalized) return normalized;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return trimmed;
  }
  return null;
}

export function buildPagePreview(page: PreviewSource): PagePreviewData {
  const domain = hostname(page.url);
  const serpTitle = page.title?.trim() || page.ogTitle?.trim() || page.url;
  const serpDescription =
    page.metaDescription?.trim() || page.excerpt?.trim() || '';
  const socialTitle = page.ogTitle?.trim() || page.title?.trim() || domain;
  const socialDescription =
    page.metaDescription?.trim() || page.excerpt?.trim() || '';

  const ogImageOnly = resolvePreviewImageUrl(page.ogImageOnly ?? page.ogImage, page.url);
  const twitterImage = resolvePreviewImageUrl(page.twitterImage, page.url);
  const socialImage =
    ogImageOnly ??
    twitterImage ??
    resolvePreviewImageUrl(page.ogImage, page.url);

  return {
    url: page.url,
    domain,
    serpTitle,
    serpDescription,
    socialTitle,
    socialDescription,
    socialImage,
    ogImage: ogImageOnly,
    twitterImage,
  };
}

/** Start URL match + up to two additional sample pages for audit previews. */
export function pickPreviewPages(pages: CrawledPage[], startUrl: string, limit = 3): CrawledPage[] {
  if (pages.length === 0) return [];

  const norm = (u: string) => {
    try {
      const p = new URL(u);
      return `${p.origin}${p.pathname.replace(/\/$/, '') || '/'}`;
    } catch {
      return u;
    }
  };
  const target = norm(startUrl);

  const primary = pages.find((p) => norm(p.url) === target) ?? pages[0];
  const rest = pages.filter((p) => p.url !== primary.url).slice(0, limit - 1);
  return [primary, ...rest];
}

export function previewCoverage(pages: CrawledPage[]): {
  withOgTitle: number;
  withOgImage: number;
  withDescription: number;
  total: number;
} {
  const total = pages.length;
  return {
    total,
    withOgTitle: pages.filter((p) => Boolean(p.ogTitle?.trim() || p.ogTitleOnly?.trim())).length,
    withOgImage: pages.filter((p) =>
      Boolean(p.ogImage?.trim() || p.ogImageOnly?.trim() || p.twitterImage?.trim()),
    ).length,
    withDescription: pages.filter((p) => Boolean(p.metaDescription?.trim())).length,
  };
}
