/** Semantic tone for SEO summary metric cards — ok / warn / bad. */
export type SeoMetricTone = 'ok' | 'warn' | 'bad';

/** Coverage % (higher is better): titles, canonical, viewport, etc. */
export function pctCoverageTone(pct: number): SeoMetricTone {
  if (pct >= 95) return 'ok';
  if (pct >= 80) return 'warn';
  return 'bad';
}

/** Count of problems (zero is good): dups, noindex pages, soft404, missing alt. */
export function countProblemTone(count: number, total = 0): SeoMetricTone {
  if (count <= 0) return 'ok';
  if (total > 0 && count / total <= 0.05) return 'warn';
  return 'bad';
}

/** 0–100 score (higher is better): head score, content score. */
export function scoreTone(score: number | null | undefined): SeoMetricTone | null {
  if (score == null) return null;
  if (score >= 90) return 'ok';
  if (score >= 75) return 'warn';
  return 'bad';
}

export function pctFromPart(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}
