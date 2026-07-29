/**
 * Issue clearance score from the latest crawl snapshot.
 *
 * NOT temporal "fix progress" (we do not track resolved/closed issues over time).
 * Formula mirrors the issue penalty in {@link computeHealthScore}:
 * 100 − min(100, errors×6 + warnings×1.5). Re-run a crawl after fixes to refresh.
 */
import type { SeoIssue } from '../types/crawl.types';

/** Count open errors/warnings for UI captions. */
export function fixProgressCounts(issues: SeoIssue[]): { errors: number; warnings: number } {
  let errors = 0;
  let warnings = 0;
  for (const i of issues) {
    if (i.severity === 'error') errors += 1;
    else if (i.severity === 'warning') warnings += 1;
  }
  return { errors, warnings };
}

/**
 * Aligns with the base issue penalty in {@link computeHealthScore} (without head/content blend).
 */
export function computeFixProgress(issues: SeoIssue[]): number {
  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  if (errors === 0 && warnings === 0) return 100;
  const remaining = Math.min(100, errors * 6 + warnings * 1.5);
  return Math.max(0, Math.round(100 - remaining));
}
