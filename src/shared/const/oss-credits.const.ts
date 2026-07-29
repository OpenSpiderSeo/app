/**
 * OSS libraries wired into OpenSpider (MIT/Apache-friendly).
 * Sources documented in docs/OSS-CREDITS.md
 */
export interface OssCredit {
  name: string;
  package: string;
  url: string;
  license: string;
  usedFor: string;
}

export const OSS_CREDITS: OssCredit[] = [
  {
    name: 'Cheerio',
    package: 'cheerio',
    url: 'https://github.com/cheeriojs/cheerio',
    license: 'MIT',
    usedFor: 'HTML parse & SEO field extraction',
  },
  {
    name: 'robots-parser',
    package: 'robots-parser',
    url: 'https://github.com/SamDecrock/robots-parser',
    license: 'MIT',
    usedFor: 'robots.txt allow/disallow + sitemap discovery',
  },
  {
    name: 'PQueue',
    package: 'p-queue',
    url: 'https://github.com/sindresorhus/p-queue',
    license: 'MIT',
    usedFor: 'Crawl concurrency / rate control',
  },
  {
    name: 'fast-xml-parser',
    package: 'fast-xml-parser',
    url: 'https://github.com/NaturalIntelligence/fast-xml-parser',
    license: 'MIT',
    usedFor: 'Parse XML sitemaps',
  },
  {
    name: 'Mozilla Readability',
    package: '@mozilla/readability',
    url: 'https://github.com/mozilla/readability',
    license: 'Apache-2.0',
    usedFor: 'Article excerpt & readable content length',
  },
  {
    name: 'LinkedOM',
    package: 'linkedom',
    url: 'https://github.com/WebReflection/linkedom',
    license: 'ISC',
    usedFor: 'DOM for Readability in Node/Electron',
  },
  {
    name: 'franc-min',
    package: 'franc-min',
    url: 'https://github.com/wooorm/franc',
    license: 'MIT',
    usedFor: 'Page language detection',
  },
  {
    name: 'keyword-extractor',
    package: 'keyword-extractor',
    url: 'https://github.com/michaeldelorenzo/keyword-extractor',
    license: 'MIT',
    usedFor: 'On-page keyword signals',
  },
  {
    name: 'string-similarity',
    package: 'string-similarity',
    url: 'https://github.com/aceakash/string-similarity',
    license: 'ISC',
    usedFor: 'Near-duplicate title/content detection',
  },
  {
    name: 'he',
    package: 'he',
    url: 'https://github.com/mathiasbynens/he',
    license: 'MIT',
    usedFor: 'HTML entity decode in titles/meta',
  },
  {
    name: 'HeroUI',
    package: '@heroui/react',
    url: 'https://github.com/heroui-inc/heroui',
    license: 'MIT',
    usedFor: 'Desktop UI components',
  },
  {
    name: 'TanStack Query / Table / Virtual',
    package: '@tanstack/react-query',
    url: 'https://github.com/TanStack/query',
    license: 'MIT',
    usedFor: 'Data cache & virtualized tables',
  },
  {
    name: 'IndexNow',
    package: 'indexnow.org (native client)',
    url: 'https://www.indexnow.org/documentation',
    license: 'Protocol',
    usedFor: 'Notify Bing/Yandex/etc. about crawled indexable URLs',
  },
  {
    name: 'HEAD checklist (inspired)',
    package: 'joshbuchea/HEAD',
    url: 'https://github.com/joshbuchea/HEAD',
    license: 'Docs',
    usedFor: 'Document <head> completeness score in SEO summary',
  },
];
