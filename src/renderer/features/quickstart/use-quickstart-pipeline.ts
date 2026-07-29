/** Hook: QuickStart pipeline state in React Query (survives unmount). */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKey } from '../../lib/query-keys.const';
import {
  emptyQuickStartPipeline,
  QS_STAGE_ORDER,
  type QsStageId,
  type QsStageStatus,
  type QuickStartPipelineState,
} from './quickstart-pipeline';

export function useQuickStartPipeline(seedUrl: string, seedKeyword: string) {
  const queryClient = useQueryClient();

  const { data: pipeline = emptyQuickStartPipeline(seedUrl, seedKeyword) } = useQuery({
    queryKey: QueryKey.QuickStartPipeline,
    queryFn: async () =>
      queryClient.getQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline) ??
      emptyQuickStartPipeline(seedUrl, seedKeyword),
    initialData: () =>
      queryClient.getQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline) ??
      emptyQuickStartPipeline(seedUrl, seedKeyword),
    staleTime: Infinity,
    gcTime: Infinity,
  });

  const patch = useCallback(
    (partial: Partial<QuickStartPipelineState>) => {
      queryClient.setQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline, (prev) => ({
        ...(prev ?? emptyQuickStartPipeline(seedUrl, seedKeyword)),
        ...partial,
      }));
    },
    [queryClient, seedUrl, seedKeyword],
  );

  const setStage = useCallback(
    (id: QsStageId, status: QsStageStatus) => {
      queryClient.setQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline, (prev) => {
        const base = prev ?? emptyQuickStartPipeline(seedUrl, seedKeyword);
        return { ...base, stages: { ...base.stages, [id]: status } };
      });
    },
    [queryClient, seedUrl, seedKeyword],
  );

  const resetStages = useCallback(() => {
    queryClient.setQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline, (prev) => ({
      ...(prev ?? emptyQuickStartPipeline(seedUrl, seedKeyword)),
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
    }));
  }, [queryClient, seedUrl, seedKeyword]);

  const markRunningErrors = useCallback(() => {
    queryClient.setQueryData<QuickStartPipelineState>(QueryKey.QuickStartPipeline, (prev) => {
      const base = prev ?? emptyQuickStartPipeline(seedUrl, seedKeyword);
      const stages = { ...base.stages };
      for (const id of QS_STAGE_ORDER) {
        if (stages[id] === 'running') stages[id] = 'error';
      }
      return { ...base, stages };
    });
  }, [queryClient, seedUrl, seedKeyword]);

  return { pipeline, patch, setStage, resetStages, markRunningErrors };
}
