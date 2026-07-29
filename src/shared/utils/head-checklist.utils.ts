/**
 * Essential document <head> checklist inspired by joshbuchea/HEAD
 * (https://github.com/joshbuchea/HEAD) — only items OpenSpider can score from crawl data.
 */
import type { CrawledPage } from '../types/crawl.types';
import { hasMetaDescription, pageHreflang } from './crawl-state.utils';
import { isHtmlContentType } from './page-audit.utils';

export interface HeadCheckItem {
  id: string;
  group: 'document' | 'meta' | 'link' | 'social' | 'mobile' | 'structured';
  label: string;
  /** How we detect it from CrawledPage (null = informational only / needs HTML store). */
  check: (page: CrawledPage) => boolean | null;
}

export const HEAD_CHECKLIST: HeadCheckItem[] = [
  {
    id: 'title',
    group: 'document',
    label: '<title>',
    check: (p) => Boolean(p.title?.trim()),
  },
  {
    id: 'meta-description',
    group: 'meta',
    label: 'meta description',
    check: (p) => hasMetaDescription(p),
  },
  {
    id: 'html-lang',
    group: 'document',
    label: 'html[lang]',
    check: (p) => Boolean(p.htmlLang?.trim()),
  },
  {
    id: 'canonical',
    group: 'link',
    label: 'link rel=canonical',
    check: (p) => Boolean(p.canonical?.trim()),
  },
  {
    id: 'viewport',
    group: 'mobile',
    label: 'meta viewport',
    check: (p) => p.hasViewport,
  },
  {
    id: 'robots-meta',
    group: 'meta',
    label: 'meta robots (optional)',
    check: (p) => (p.robotsMeta ? true : null),
  },
  {
    id: 'og-title',
    group: 'social',
    label: 'og:title',
    check: (p) => Boolean(p.ogTitle?.trim() || p.ogTitleOnly?.trim()),
  },
  {
    id: 'og-image',
    group: 'social',
    label: 'og:image',
    check: (p) => Boolean(p.ogImage?.trim()),
  },
  {
    id: 'twitter-card',
    group: 'social',
    label: 'twitter:card',
    check: (p) => Boolean(p.twitterCard?.trim()),
  },
  {
    id: 'hreflang',
    group: 'link',
    label: 'link hreflang',
    check: (p) => (pageHreflang(p).length > 0 ? true : null),
  },
  {
    id: 'json-ld',
    group: 'structured',
    label: 'JSON-LD',
    check: (p) => p.jsonLdCount > 0,
  },
];

export interface HeadChecklistScore {
  pageUrl: string;
  pass: number;
  fail: number;
  skip: number;
  score: number;
  items: { id: string; label: string; group: string; status: 'pass' | 'fail' | 'skip' }[];
}

export function scoreHeadChecklist(page: CrawledPage): HeadChecklistScore {
  const items = HEAD_CHECKLIST.map((item) => {
    const raw = item.check(page);
    const status: 'pass' | 'fail' | 'skip' = raw === null ? 'skip' : raw ? 'pass' : 'fail';
    return { id: item.id, label: item.label, group: item.group, status };
  });
  const pass = items.filter((i) => i.status === 'pass').length;
  const fail = items.filter((i) => i.status === 'fail').length;
  const skip = items.filter((i) => i.status === 'skip').length;
  const denom = pass + fail;
  const score = denom === 0 ? 0 : Math.round((pass / denom) * 100);
  return { pageUrl: page.url, pass, fail, skip, score, items };
}

export function averageHeadScore(pages: CrawledPage[]): {
  avgScore: number | null;
  pagesScored: number;
  failRateById: { id: string; label: string; failPct: number }[];
} {
  const ok = pages.filter((p) => !p.error && p.statusCode >= 200 && p.statusCode < 300 && isHtmlContentType(p.contentType));
  if (ok.length === 0) {
    return { avgScore: null, pagesScored: 0, failRateById: [] };
  }
  const scores = ok.map(scoreHeadChecklist);
  const avgScore = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length);
  const failRateById = HEAD_CHECKLIST.map((item) => {
    let fails = 0;
    let applicable = 0;
    for (const s of scores) {
      const row = s.items.find((i) => i.id === item.id);
      if (!row || row.status === 'skip') continue;
      applicable += 1;
      if (row.status === 'fail') fails += 1;
    }
    return {
      id: item.id,
      label: item.label,
      failPct: applicable === 0 ? 0 : Math.round((fails / applicable) * 100),
    };
  }).sort((a, b) => b.failPct - a.failPct);
  return { avgScore, pagesScored: ok.length, failRateById };
}
