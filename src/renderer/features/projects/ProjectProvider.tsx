import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProjectInput,
  SeoProject,
  UpdateProjectInput,
} from '../../../shared/types/project.types';
import { QueryKey } from '../../lib/query-keys.const';
import { emptyCrawlState, emptyProgress, normalizeCrawlState } from '../../../shared/utils/crawl-state.utils';
import { defaultCrawlMeta } from '../crawl/CrawlQuerySync';

interface ProjectContextValue {
  projects: SeoProject[];
  active: SeoProject | null;
  isLoading: boolean;
  selectProject: (id: string | null) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<SeoProject>;
  updateProject: (id: string, patch: UpdateProjectInput) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

async function resetWorkspaceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<void> {
  const empty = emptyCrawlState();
  queryClient.setQueryData(QueryKey.CrawlProgress, empty.progress);
  queryClient.setQueryData(QueryKey.CrawlPages, empty.pages);
  queryClient.setQueryData(QueryKey.CrawlIssues, empty.issues);
  queryClient.setQueryData(QueryKey.CrawlMeta, { ...defaultCrawlMeta });

  await queryClient.invalidateQueries({ queryKey: QueryKey.Projects });
  await queryClient.invalidateQueries({ queryKey: QueryKey.ActiveProject });
  await queryClient.invalidateQueries({ queryKey: QueryKey.CrawlProgress });
  await queryClient.invalidateQueries({ queryKey: QueryKey.CrawlPages });
  await queryClient.invalidateQueries({ queryKey: QueryKey.CrawlIssues });
  await queryClient.invalidateQueries({ queryKey: QueryKey.CrawlMeta });
  await queryClient.invalidateQueries({ queryKey: QueryKey.ProjectMemory });
  await queryClient.invalidateQueries({ queryKey: ['history'] });
  await queryClient.invalidateQueries({ queryKey: ['ranks'] });

  try {
    const state = normalizeCrawlState(await window.openspider.getCrawlState());
    queryClient.setQueryData(QueryKey.CrawlProgress, state.progress ?? emptyProgress);
    queryClient.setQueryData(QueryKey.CrawlPages, state.pages);
    queryClient.setQueryData(QueryKey.CrawlIssues, state.issues);
  } catch {
    /* keep empty */
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const enabled = typeof window !== 'undefined' && Boolean(window.openspider);

  const listQuery = useQuery({
    queryKey: QueryKey.Projects,
    queryFn: () => window.openspider.listProjects(),
    enabled,
  });

  const activeQuery = useQuery({
    queryKey: QueryKey.ActiveProject,
    queryFn: () => window.openspider.getActiveProject(),
    enabled,
  });

  const refresh = useCallback(async () => {
    await resetWorkspaceQueries(queryClient);
  }, [queryClient]);

  const selectMutation = useMutation({
    mutationFn: (id: string | null) => window.openspider.setActiveProject(id),
    onSuccess: async (project) => {
      queryClient.setQueryData(QueryKey.ActiveProject, project);
      await resetWorkspaceQueries(queryClient);
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateProjectInput) => window.openspider.createProject(input),
    onSuccess: async () => {
      await resetWorkspaceQueries(queryClient);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateProjectInput }) =>
      window.openspider.updateProject(id, patch),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QueryKey.Projects });
      await queryClient.invalidateQueries({ queryKey: QueryKey.ActiveProject });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => window.openspider.deleteProject(id),
    onSuccess: async () => {
      await resetWorkspaceQueries(queryClient);
    },
  });

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects: listQuery.data ?? [],
      active: activeQuery.data ?? null,
      isLoading: listQuery.isLoading || activeQuery.isLoading,
      selectProject: async (id) => {
        await selectMutation.mutateAsync(id);
      },
      createProject: (input) => createMutation.mutateAsync(input),
      updateProject: async (id, patch) => {
        await updateMutation.mutateAsync({ id, patch });
      },
      deleteProject: async (id) => {
        await deleteMutation.mutateAsync(id);
      },
      refresh,
    }),
    [
      listQuery.data,
      activeQuery.data,
      listQuery.isLoading,
      activeQuery.isLoading,
      selectMutation,
      createMutation,
      updateMutation,
      deleteMutation,
      refresh,
    ],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used inside ProjectProvider');
  }
  return ctx;
}
