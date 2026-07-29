/** Content / readability scoring (Surfer/Yoast-lite, local heuristics). */
import type { CrawledPage } from '../types/crawl.types';
import { hasMetaDescription, pageH1 } from './crawl-state.utils';
import { isHtmlContentType } from './page-audit.utils';

export interface ContentScoreBreakdown {
  score: number;
  flesch: number | null;
  words: number;
  readingTimeMin: number;
  signals: { id: string; ok: boolean; label: string }[];
}

function countSentences(text: string): number {
  const parts = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  return Math.max(1, parts.length);
}

function countSyllablesApprox(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zа-яё]/gi, '');
  if (!w) return 0;
  // Latin heuristic
  if (/[a-z]/i.test(w) && !/[а-яё]/i.test(w)) {
    const m = w.match(/[aeiouy]+/g);
    let n = m ? m.length : 1;
    if (w.endsWith('e') && n > 1) n -= 1;
    return Math.max(1, n);
  }
  // Cyrillic: vowels
  const m = w.match(/[аеёиоуыэюя]/gi);
  return Math.max(1, m ? m.length : 1);
}

/** Flesch Reading Ease approximation (EN-oriented; still useful as relative signal). */
export function fleschReadingEase(text: string, wordCount: number): number | null {
  const words = Math.max(wordCount, text.split(/\s+/).filter(Boolean).length);
  if (words < 20) return null;
  const sentences = countSentences(text);
  const syllables = text
    .split(/\s+/)
    .filter(Boolean)
    .reduce((n, w) => n + countSyllablesApprox(w), 0);
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scorePageContent(page: CrawledPage): ContentScoreBreakdown {
  const words = page.wordCount || 0;
  const h1 = pageH1(page);
  const text = [page.excerpt, page.title, h1.join(' ')].filter(Boolean).join('. ');
  const flesch = fleschReadingEase(text || page.title || '', words);
  const signals = [
    { id: 'words', ok: words >= 300, label: '≥300 words' },
    { id: 'h1', ok: h1.length === 1, label: 'single H1' },
    { id: 'h2', ok: page.h2Count >= 2, label: '≥2 H2' },
    { id: 'title', ok: Boolean(page.title?.trim()), label: 'title' },
    { id: 'desc', ok: hasMetaDescription(page), label: 'meta description' },
    { id: 'jsonld', ok: page.jsonLdCount > 0, label: 'JSON-LD' },
    {
      id: 'read',
      ok: flesch == null ? true : flesch >= 40,
      label: flesch == null ? 'readability n/a' : `Flesch ${flesch}`,
    },
  ];
  const pass = signals.filter((s) => s.ok).length;
  let score = Math.round((pass / signals.length) * 100);
  if (words >= 800) score = Math.min(100, score + 5);
  if (words > 0 && words < 150) score = Math.max(0, score - 15);
  return {
    score,
    flesch,
    words,
    readingTimeMin: page.readingTimeMin || Math.max(1, Math.round(words / 200)),
    signals,
  };
}

export function averageContentScore(pages: CrawledPage[]): number | null {
  const ok = pages.filter(
    (p) => !p.error && p.statusCode >= 200 && p.statusCode < 300 && isHtmlContentType(p.contentType),
  );
  if (ok.length === 0) return null;
  const sum = ok.reduce((n, p) => n + scorePageContent(p).score, 0);
  return Math.round(sum / ok.length);
}
