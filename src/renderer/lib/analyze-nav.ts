/** Cross-panel bridges: open page card / filter issues / switch analysis segment. */
import { NavSection, type NavSectionName } from '../app/routes.const';

export type AnalysisSectionId = 'metrics' | 'audit' | 'googlebot';

const ANALYSIS_SECTION_KEY = 'openspider:analysis-section';
const ANALYSIS_SECTION_EVENT = 'openspider:analysis-section';

export function requestAnalysisSection(section: AnalysisSectionId): void {
  try {
    sessionStorage.setItem(ANALYSIS_SECTION_KEY, section);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(ANALYSIS_SECTION_EVENT, { detail: section }));
}

export function openAnalysisSection(
  section: AnalysisSectionId,
  navigate?: (target: NavSectionName) => void,
): void {
  requestAnalysisSection(section);
  navigate?.(NavSection.Metrics);
}

export function consumePendingAnalysisSection(): AnalysisSectionId | null {
  try {
    const value = sessionStorage.getItem(ANALYSIS_SECTION_KEY);
    if (value) sessionStorage.removeItem(ANALYSIS_SECTION_KEY);
    if (value === 'metrics' || value === 'audit' || value === 'googlebot') return value;
    return null;
  } catch {
    return null;
  }
}

export function onAnalysisSectionRequest(handler: (section: AnalysisSectionId) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<AnalysisSectionId>).detail;
    if (detail === 'metrics' || detail === 'audit' || detail === 'googlebot') handler(detail);
  };
  window.addEventListener(ANALYSIS_SECTION_EVENT, listener);
  return () => window.removeEventListener(ANALYSIS_SECTION_EVENT, listener);
}

const PAGE_KEY = 'openspider:page-url';
const PAGE_EVENT = 'openspider:page-open';
const ISSUE_KEY = 'openspider:issue-code';
const ISSUE_EVENT = 'openspider:issue-filter';
const CRAWL_FILTER_KEY = 'openspider:crawl-filter';
const CRAWL_FILTER_EVENT = 'openspider:crawl-filter';

export function requestPageDetail(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(PAGE_EVENT, { detail: trimmed }));
}

export function openPageInCrawl(
  url: string,
  navigate?: (section: NavSectionName) => void,
): void {
  requestPageDetail(url);
  navigate?.(NavSection.Crawl);
}

export function consumePendingPageUrl(): string | null {
  try {
    const value = sessionStorage.getItem(PAGE_KEY);
    if (value) sessionStorage.removeItem(PAGE_KEY);
    return value;
  } catch {
    return null;
  }
}

export function onPageDetailRequest(handler: (url: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string' && detail.trim()) handler(detail.trim());
  };
  window.addEventListener(PAGE_EVENT, listener);
  return () => window.removeEventListener(PAGE_EVENT, listener);
}

export function requestIssueFilter(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(ISSUE_KEY, trimmed);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(ISSUE_EVENT, { detail: trimmed }));
}

export function openIssuesFiltered(
  code: string,
  navigate?: (section: NavSectionName) => void,
): void {
  requestIssueFilter(code);
  navigate?.(NavSection.Issues);
}

export function onIssueFilterRequest(handler: (code: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string' && detail.trim()) handler(detail.trim());
  };
  window.addEventListener(ISSUE_EVENT, listener);
  return () => window.removeEventListener(ISSUE_EVENT, listener);
}

/** Prefill crawl table global filter (e.g. orphan path fragment or URL). */
export function requestCrawlFilter(query: string): void {
  const trimmed = query.trim();
  try {
    if (trimmed) sessionStorage.setItem(CRAWL_FILTER_KEY, trimmed);
    else sessionStorage.removeItem(CRAWL_FILTER_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CRAWL_FILTER_EVENT, { detail: trimmed }));
}

export function openCrawlFiltered(
  query: string,
  navigate?: (section: NavSectionName) => void,
): void {
  requestCrawlFilter(query);
  navigate?.(NavSection.Crawl);
}

export function consumePendingCrawlFilter(): string | null {
  try {
    const value = sessionStorage.getItem(CRAWL_FILTER_KEY);
    if (value != null) sessionStorage.removeItem(CRAWL_FILTER_KEY);
    return value;
  } catch {
    return null;
  }
}

export function onCrawlFilterRequest(handler: (query: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string') handler(detail);
  };
  window.addEventListener(CRAWL_FILTER_EVENT, listener);
  return () => window.removeEventListener(CRAWL_FILTER_EVENT, listener);
}
