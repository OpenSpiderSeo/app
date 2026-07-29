/** Типы страницы и сессии краула. */

export const CrawlStatus = {
  Idle: 'idle',
  Running: 'running',
  Pausing: 'pausing',
  Paused: 'paused',
  Stopping: 'stopping',
  Finished: 'finished',
  Error: 'error',
} as const;

export type CrawlStatusName = (typeof CrawlStatus)[keyof typeof CrawlStatus];

export const IssueSeverity = {
  Error: 'error',
  Warning: 'warning',
  Info: 'info',
} as const;

export type IssueSeverityName = (typeof IssueSeverity)[keyof typeof IssueSeverity];

export const IssueCode = {
  HttpClientError: 'http.4xx',
  HttpServerError: 'http.5xx',
  Redirect: 'http.redirect',
  MissingTitle: 'meta.title.missing',
  DuplicateTitle: 'meta.title.duplicate',
  TitleTooShort: 'meta.title.short',
  TitleTooLong: 'meta.title.long',
  MissingMetaDescription: 'meta.description.missing',
  MetaDescriptionOgOnly: 'meta.description.og_only',
  DuplicateMetaDescription: 'meta.description.duplicate',
  MetaDescriptionTooShort: 'meta.description.short',
  MetaDescriptionTooLong: 'meta.description.long',
  TitleH1Duplicate: 'meta.title.h1_duplicate',
  TitleDescDuplicate: 'meta.title.desc_duplicate',
  MissingH1: 'heading.h1.missing',
  MultipleH1: 'heading.h1.multiple',
  MissingH2: 'heading.h2.missing',
  MissingCanonical: 'canonical.missing',
  CanonicalOffOrigin: 'canonical.off_origin',
  CanonicalSelfMismatch: 'canonical.self_mismatch',
  CanonicalNoindexMismatch: 'canonical.noindex_mismatch',
  Noindex: 'robots.noindex',
  RobotsNofollow: 'robots.nofollow',
  RobotsMetaConflict: 'robots.conflict',
  ThinContent: 'content.thin',
  ContentNoImages: 'content.no_images',
  SpellHeuristic: 'content.spell_heuristic',
  MissingOgTitle: 'social.og_title.missing',
  MissingOgImage: 'social.og_image.missing',
  MissingTwitterCard: 'social.twitter_card.missing',
  MissingJsonLd: 'schema.jsonld.missing',
  InvalidJsonLd: 'schema.jsonld.invalid',
  WeakJsonLd: 'schema.jsonld.weak',
  ImagesMissingAlt: 'a11y.img.alt_missing',
  ImagesAllMissingAlt: 'a11y.img.all_alt_missing',
  MissingHtmlLang: 'a11y.html.lang_missing',
  ButtonsWithoutName: 'a11y.button.name_missing',
  MissingSkipLink: 'a11y.skip.missing',
  LinksWithoutAccessibleName: 'a11y.link.name_missing',
  LocalNapIncomplete: 'local.nap.incomplete',
  MissingViewport: 'mobile.viewport.missing',
  ExactDuplicate: 'content.exact_duplicate',
  OrphanPage: 'links.orphan',
  DeepPage: 'links.deep',
  MissingHreflang: 'intl.hreflang.missing',
  HreflangNotReciprocal: 'intl.hreflang.not_reciprocal',
  NearDuplicate: 'content.near_duplicate',
  Soft404: 'http.soft_404',
  WeakCitability: 'content.citability.weak',
  MissingLlmsTxt: 'geo.llms_txt.missing',
  OutboundBroken: 'links.outbound.broken',
} as const;

export type IssueCodeName = (typeof IssueCode)[keyof typeof IssueCode];

export interface CrawlAuthOptions {
  loginUrl: string;
  username: string;
  password: string;
  userSelector?: string;
  passSelector?: string;
  submitSelector?: string;
}

export interface CrawlSegmentRule {
  name: string;
  pattern: string;
}

export interface CrawlOptions {
  startUrl: string;
  maxConcurrency?: number;
  requestTimeoutMs?: number;
  userAgent?: string;
  respectRobotsTxt?: boolean;
  maxDepth?: number;
  sameOriginOnly?: boolean;
  /** Soft cap; omit = unlimited. */
  maxUrls?: number;
  seedFromSitemap?: boolean;
  /** Render pages via Electron Chromium before extract. */
  renderJs?: boolean;
  /** Keep HTML in memory for custom search/extract (capped). */
  storeHtml?: boolean;
  /** Crawl only explicit URLs (depth 0), no link following by default. */
  urlList?: string[];
  listMode?: boolean;
  /** When false, do not enqueue outlinks. Default true. */
  followLinks?: boolean;
  /** First matching regex assigns segment name to page. */
  segments?: CrawlSegmentRule[];
  /** Form login before crawl; cookies applied to fetch requests. */
  auth?: CrawlAuthOptions;
  /** When true, discard prior session pages and re-fetch all URLs. Default: skip completed URLs. */
  forceRecrawl?: boolean;
}

export interface HreflangRef {
  lang: string;
  href: string;
}

/** One LocalBusiness/Organization node with incomplete NAP in JSON-LD. */
export interface LocalNapEntryEvidence {
  schemaType: string;
  hasTelephone: boolean;
  hasAddress: boolean;
  hasName: boolean;
  businessName?: string;
}

export interface LocalNapIssueEvidence {
  kind: 'local_nap';
  entries: LocalNapEntryEvidence[];
  jsonLdBlockCount: number;
}

export interface OrphanIssueEvidence {
  kind: 'orphan';
  inlinks: number;
  depth: number;
}

export interface OutboundLinkIssueEvidence {
  kind: 'outbound_broken';
  targetUrl: string;
  statusCode: number;
  anchor?: string;
  fetchError?: string;
}

export type IssueEvidence =
  | LocalNapIssueEvidence
  | OrphanIssueEvidence
  | OutboundLinkIssueEvidence;

export interface CrawledPage {
  url: string;
  /** First matching segment rule name, if any. */
  segment?: string | null;
  statusCode: number;
  contentType: string | null;
  title: string | null;
  /** meta name="description" only (not og:description fallback). */
  metaDescriptionOnly: string | null;
  /** Best available snippet text: meta description or og:description. */
  metaDescription: string | null;
  h1: string[];
  h2Count: number;
  canonical: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogTitleOnly: string | null;
  ogImage: string | null;
  /** og:image meta only (without twitter fallback). */
  ogImageOnly: string | null;
  twitterImage: string | null;
  twitterCard: string | null;
  wordCount: number;
  imagesTotal: number;
  imagesMissingAlt: number;
  buttonsWithoutName: number;
  linksWithoutAccessibleName: number;
  hasSkipLink: boolean;
  jsonLdCount: number;
  jsonLdTypes: string[];
  jsonLdInvalid: boolean;
  jsonLdLocalNapIncomplete: boolean;
  jsonLdLocalNapEvidence: LocalNapEntryEvidence[] | null;
  hasViewport: boolean;
  htmlLang: string | null;
  hreflang: HreflangRef[];
  language: string | null;
  readingTimeMin: number;
  excerpt: string | null;
  topKeywords: string[];
  contentFingerprint: string | null;
  exactContentHash: string | null;
  rendered: boolean;
  depth: number;
  inlinks: number;
  outlinks: number;
  redirectUrl: string | null;
  fetchedAt: string;
  error: string | null;
}

export interface SeoIssue {
  id: string;
  code: IssueCodeName;
  severity: IssueSeverityName;
  url: string;
  message: string;
  /** Domain bucket for filtering in Issues views */
  domain?: string;
  /** Page-specific facts from the detector (shown in fix sidebar). */
  evidence?: IssueEvidence;
}

export interface CrawlProgress {
  status: CrawlStatusName;
  queued: number;
  /** In-flight fetch workers (frontier drained but jobs still running). */
  active?: number;
  fetched: number;
  errors: number;
  /** Configured URL cap for the active crawl; 0/omit = unlimited. */
  maxUrls?: number;
  /** Resolved crawl depth limit from active options. */
  maxDepth?: number;
  /** Live issue totals while crawl is running. */
  issueCount?: number;
  issueErrors?: number;
  issueWarnings?: number;
  startedAt: string | null;
  finishedAt: string | null;
  startUrl: string | null;
}

export interface CrawlState {
  progress: CrawlProgress;
  pages: CrawledPage[];
  issues: SeoIssue[];
}

export interface CrawlSessionFile {
  version: 1;
  savedAt: string;
  options: CrawlOptions;
  state: CrawlState;
}

/** Checkpoint for pause / restore after app restart. */
export interface CrawlCheckpoint {
  version: 2;
  savedAt: string;
  options: CrawlOptions;
  state: CrawlState;
  frontier: { url: string; depth: number }[];
  seen: string[];
  inlinkCounts: [string, number][];
  issueIds: string[];
  startedAt: string | null;
}
