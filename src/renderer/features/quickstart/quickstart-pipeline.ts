/** Persisted QuickStart pipeline state in React Query (survives panel unmount). */
import type {
  FullAuditResult,
  LighthouseScores,
  LocalMetricsSnapshot,
  SerpReport,
} from '../../../shared/types/audit.types';

export type QsStageId =
  | 'crawl'
  | 'issues'
  | 'lighthouse'
  | 'serp'
  | 'geo'
  | 'score'
  | 'history'
  | 'export';

export type QsStageStatus = 'pending' | 'running' | 'done' | 'error' | 'skip';

export const QS_STAGE_ORDER: QsStageId[] = [
  'crawl',
  'issues',
  'lighthouse',
  'serp',
  'geo',
  'score',
  'history',
  'export',
];

export interface QuickStartPipelineState {
  running: boolean;
  stages: Record<QsStageId, QsStageStatus>;
  log: string | null;
  health: number;
  local: LocalMetricsSnapshot | null;
  lh: LighthouseScores | null;
  serp: SerpReport | null;
  reportPath: string | null;
  sitemapPath: string | null;
  auditSections: FullAuditResult['sections'];
  url: string;
  keyword: string;
}

export function emptyQuickStartPipeline(
  url = 'https://',
  keyword = '',
): QuickStartPipelineState {
  return {
    running: false,
    stages: Object.fromEntries(QS_STAGE_ORDER.map((id) => [id, 'pending'])) as Record<
      QsStageId,
      QsStageStatus
    >,
    log: null,
    health: 0,
    local: null,
    lh: null,
    serp: null,
    reportPath: null,
    sitemapPath: null,
    auditSections: [],
    url,
    keyword,
  };
}
