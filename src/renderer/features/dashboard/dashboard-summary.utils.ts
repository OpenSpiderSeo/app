/** Dashboard hero metrics — crawl state, health, fix progress, priority copy. */
import type { CrawledPage, CrawlProgress, CrawlStatusName, SeoIssue } from '../../../shared/types/crawl.types';
import { CrawlStatus } from '../../../shared/types/crawl.types';
import { computeFixProgress } from '../../../shared/utils/fix-progress.utils';
import { healthBandFromScore, type HealthBandId } from '../../../shared/utils/honor-rank.utils';
import { buildSeoAuditMetrics } from '../../../shared/utils/seo-audit.utils';

const ACTIVE_CRAWL = new Set<CrawlStatusName>([
  CrawlStatus.Running,
  CrawlStatus.Pausing,
  CrawlStatus.Stopping,
]);

export type DashboardPriorityId = 'crawl' | 'empty' | 'critical' | 'errors' | 'warnings' | 'ok';

export interface DashboardSummary {
  inProgress: boolean;
  hasCrawlData: boolean;
  errors: number;
  warnings: number;
  health: number | null;
  fixProgress: number | null;
  healthBand: HealthBandId | null;
  priority: DashboardPriorityId;
}

export function isCrawlInProgress(status: CrawlStatusName | undefined): boolean {
  return status != null && ACTIVE_CRAWL.has(status);
}

export function buildDashboardSummary(input: {
  pages: CrawledPage[];
  issues: SeoIssue[];
  crawlStatus: CrawlStatusName | undefined;
  crawlProgress?: Pick<
    CrawlProgress,
    'fetched' | 'issueErrors' | 'issueWarnings' | 'issueCount'
  > | null;
}): DashboardSummary {
  const { pages, issues, crawlStatus, crawlProgress } = input;
  const inProgress = isCrawlInProgress(crawlStatus);
  const livePages = Math.max(pages.length, crawlProgress?.fetched ?? 0);
  const errors =
    inProgress && crawlProgress?.issueErrors != null
      ? crawlProgress.issueErrors
      : issues.filter((i) => i.severity === 'error').length;
  const warnings =
    inProgress && crawlProgress?.issueWarnings != null
      ? crawlProgress.issueWarnings
      : issues.filter((i) => i.severity === 'warning').length;
  const hasCrawlData =
    livePages > 0 ||
    issues.length > 0 ||
    (crawlProgress?.issueCount ?? 0) > 0;

  if (inProgress) {
    return {
      inProgress: true,
      hasCrawlData,
      errors,
      warnings,
      health: null,
      fixProgress: null,
      healthBand: null,
      priority: 'crawl',
    };
  }

  if (!hasCrawlData) {
    return {
      inProgress: false,
      hasCrawlData: false,
      errors: 0,
      warnings: 0,
      health: null,
      fixProgress: null,
      healthBand: null,
      priority: 'empty',
    };
  }

  const audit = buildSeoAuditMetrics(pages, issues);
  const health = audit.healthScore;
  const fixProgress = computeFixProgress(issues);
  const healthBand = healthBandFromScore(health);

  let priority: DashboardPriorityId = 'ok';
  if (health < 45) priority = 'critical';
  else if (errors > 0) priority = 'errors';
  else if (warnings > 0) priority = 'warnings';

  return {
    inProgress: false,
    hasCrawlData: true,
    errors,
    warnings,
    health,
    fixProgress,
    healthBand,
    priority,
  };
}
