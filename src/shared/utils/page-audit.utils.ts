/** Helpers for deciding which crawled pages should receive HTML SEO checks. */
import type { CrawledPage } from '../types/crawl.types';

/** MIME from Content-Type header (without parameters). */
export function parseContentTypeMedia(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  const base = contentType.split(';')[0]?.trim().toLowerCase();
  return base || null;
}

export function isHtmlContentType(contentType: string | null | undefined): boolean {
  const media = parseContentTypeMedia(contentType);
  if (!media) return false;
  return media === 'text/html' || media === 'application/xhtml+xml';
}

/** Non-HTML assets that must not receive on-page meta/heading/schema checks. */
export function isNonHtmlAssetContentType(contentType: string | null | undefined): boolean {
  const media = parseContentTypeMedia(contentType);
  if (!media) return false;
  if (isHtmlContentType(contentType)) return false;
  if (media.startsWith('image/')) return true;
  if (media.startsWith('video/')) return true;
  if (media.startsWith('audio/')) return true;
  if (media.startsWith('font/')) return true;
  if (media === 'application/pdf') return true;
  if (media === 'application/json' || media.endsWith('+json')) return true;
  if (media === 'application/xml' || media === 'text/xml' || media.endsWith('+xml')) return true;
  if (media === 'application/octet-stream') return true;
  if (media === 'text/plain' || media === 'text/csv') return true;
  if (media === 'text/css' || media === 'text/javascript' || media === 'application/javascript') {
    return true;
  }
  return false;
}

/** Cloudflare and similar infra URLs — HTTP errors here are not site content bugs. */
export function isInfrastructureNoiseUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return /\/cdn-cgi\//i.test(path);
  } catch {
    return /\/cdn-cgi\//i.test(url);
  }
}

/** Run on-page SEO checks only for successful HTML documents. */
export function shouldRunOnPageSeoChecks(page: CrawledPage): boolean {
  if (page.error) return false;
  if (page.statusCode < 200 || page.statusCode >= 300) return false;
  return isHtmlContentType(page.contentType);
}

/** HTML 200 pages used for sitewide duplicate/orphan/hreflang checks. */
export function isAuditableHtmlPage(page: CrawledPage): boolean {
  return shouldRunOnPageSeoChecks(page);
}
