/** Labs tool payloads — keyword mentions, sitemap extract, outbound link check. */

export const MentionLocation = {
  Title: 'title',
  Meta: 'meta',
  H1: 'h1',
  H2: 'h2',
  H3: 'h3',
  H4: 'h4',
  H5: 'h5',
  H6: 'h6',
  Body: 'body',
} as const;

export type MentionLocationName = (typeof MentionLocation)[keyof typeof MentionLocation];

export interface KeywordMentionsInput {
  keywords: string[];
  /** Limit to these page URLs; empty = all stored HTML pages. */
  scopeUrls?: string[];
  caseSensitive?: boolean;
}

export interface KeywordMentionCell {
  keyword: string;
  pageUrl: string;
  locations: MentionLocationName[];
}

export interface KeywordMentionsResult {
  cells: KeywordMentionCell[];
  pagesChecked: number;
  keywordsChecked: number;
  error?: string;
}

export interface SitemapExtractInput {
  sitemapUrl: string;
}

export interface SitemapExtractResult {
  urls: string[];
  count: number;
  error?: string;
}

export interface OutboundLinksCheckInput {
  /** Check links to other origins (default true). */
  externalOnly?: boolean;
  /** Also check same-origin links not yet in crawl results. */
  includeInternalUncrawled?: boolean;
  maxLinks?: number;
  concurrency?: number;
  userAgent?: string;
  requestTimeoutMs?: number;
}

export interface OutboundBrokenSource {
  url: string;
  anchor?: string;
}

export interface OutboundBrokenRow {
  targetUrl: string;
  statusCode: number;
  error?: string;
  sources: OutboundBrokenSource[];
}

export interface OutboundLinksCheckResult {
  broken: OutboundBrokenRow[];
  checked: number;
  skipped: number;
  issuesAdded: number;
  error?: string;
}
