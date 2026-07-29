/** Константы продукта. */
export const APP_NAME = 'OpenSpider';
/** Build-time mirror of package.json version (see vite.app-version.ts). */
export const APP_VERSION = __APP_VERSION__;

export const DEFAULT_CRAWL_OPTIONS = {
  maxConcurrency: 6,
  requestTimeoutMs: 15_000,
  userAgent: 'OpenSpider/1.0 (+https://github.com/OpenSpiderSeo/app; open-source SEO crawler)',
  respectRobotsTxt: true,
  maxDepth: 10,
  sameOriginOnly: true,
  seedFromSitemap: true,
  renderJs: false,
  storeHtml: true,
  followLinks: true,
} as const;
