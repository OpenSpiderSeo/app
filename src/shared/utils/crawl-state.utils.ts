import {
  CrawlStatus,
  type CrawledPage,
  type CrawlProgress,
  type CrawlState,
} from '../types/crawl.types';

export const defaultCrawlProgress: CrawlProgress = {
  status: CrawlStatus.Idle,
  queued: 0,
  fetched: 0,
  errors: 0,
  startedAt: null,
  finishedAt: null,
  startUrl: null,
};

/** Alias used by renderer query bootstrap. */
export const emptyProgress = defaultCrawlProgress;

/** Safe H1 list — Go JSON may emit `"h1": null`. */
export function pageH1(page: Pick<CrawledPage, 'h1'> | null | undefined): string[] {
  return page?.h1 ?? [];
}

/** Safe hreflang list. */
export function pageHreflang(page: Pick<CrawledPage, 'hreflang'> | null | undefined) {
  return page?.hreflang ?? [];
}

/** Trimmed title or empty string. */
export function pageTitle(page: Pick<CrawledPage, 'title'> | null | undefined): string {
  return page?.title?.trim() ?? '';
}

/** Effective meta description (dedicated tag preferred over og:description). */
export function pageMetaDescription(
  page: Pick<CrawledPage, 'metaDescriptionOnly' | 'metaDescription'> | null | undefined,
): string {
  return page?.metaDescriptionOnly?.trim() || page?.metaDescription?.trim() || '';
}

export function hasMetaDescription(
  page: Pick<CrawledPage, 'metaDescriptionOnly' | 'metaDescription'> | null | undefined,
): boolean {
  return Boolean(pageMetaDescription(page));
}

/** Go JSON may emit null slices / omit arrays — UI expects arrays. */
export function normalizeCrawledPage(page: CrawledPage): CrawledPage {
  return {
    ...page,
    h1: pageH1(page),
    hreflang: pageHreflang(page),
    jsonLdTypes: page.jsonLdTypes ?? [],
    topKeywords: page.topKeywords ?? [],
    jsonLdLocalNapEvidence: page.jsonLdLocalNapEvidence ?? null,
  };
}

/** Go JSON may emit null slices — UI expects arrays. */
export function normalizeCrawlState(state: CrawlState | null | undefined): CrawlState {
  if (!state) {
    return { progress: { ...defaultCrawlProgress }, pages: [], issues: [] };
  }
  return {
    progress: state.progress ?? { ...defaultCrawlProgress },
    pages: (state.pages ?? []).map(normalizeCrawledPage),
    issues: state.issues ?? [],
  };
}

export function emptyCrawlState(): CrawlState {
  return normalizeCrawlState(null);
}
