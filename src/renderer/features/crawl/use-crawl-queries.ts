/** Гранулярные TanStack Query хуки — подписка только на нужный слайс. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CrawledPage, CrawlProgress, SeoIssue } from '../../../shared/types/crawl.types';
import { QueryKey } from '../../lib/query-keys.const';
import { emptyProgress, normalizeCrawlState } from '../../../shared/utils/crawl-state.utils';
import {
  defaultCrawlMeta,
  type CrawlMeta,
} from './CrawlQuerySync';

export function useCrawlProgress() {
  return useQuery({
    queryKey: QueryKey.CrawlProgress,
    queryFn: async () => normalizeCrawlState(await window.openspider.getCrawlState()).progress,
    initialData: emptyProgress,
    select: (data: CrawlProgress) => data,
  });
}

export function useCrawlPages() {
  return useQuery({
    queryKey: QueryKey.CrawlPages,
    queryFn: async () => normalizeCrawlState(await window.openspider.getCrawlState()).pages,
    initialData: [] as CrawledPage[],
  });
}

export function useCrawlIssues() {
  return useQuery({
    queryKey: QueryKey.CrawlIssues,
    queryFn: async () => normalizeCrawlState(await window.openspider.getCrawlState()).issues,
    initialData: [] as SeoIssue[],
  });
}

export function useCrawlMeta() {
  return useQuery({
    queryKey: QueryKey.CrawlMeta,
    queryFn: async (): Promise<CrawlMeta> => defaultCrawlMeta,
    initialData: defaultCrawlMeta,
  });
}

export function useCrawlPageCount() {
  return useQuery({
    queryKey: QueryKey.CrawlPages,
    queryFn: async () => normalizeCrawlState(await window.openspider.getCrawlState()).pages,
    initialData: [] as CrawledPage[],
    select: (pages) => pages.length,
  });
}

export function useAppInfoQuery() {
  return useQuery({
    queryKey: QueryKey.AppInfo,
    queryFn: () => window.openspider.getAppInfo(),
    enabled: typeof window !== 'undefined' && Boolean(window.openspider),
  });
}

export function useIntegrationsQuery() {
  return useQuery({
    queryKey: QueryKey.Integrations,
    queryFn: () => window.openspider.listIntegrations(),
    enabled: typeof window !== 'undefined' && Boolean(window.openspider),
  });
}

export function useCrawlActions() {
  const queryClient = useQueryClient();

  const start = useMutation({
    mutationFn: async (startUrlOrOptions: string | { startUrl: string } & Record<string, unknown>) => {
      let saved: Record<string, unknown> = {};
      try {
        saved = await window.openspider.getCrawlConfig();
      } catch {
        saved = {};
      }
      const options =
        typeof startUrlOrOptions === 'string'
          ? { ...saved, startUrl: startUrlOrOptions }
          : { ...saved, ...startUrlOrOptions };
      const result = await window.openspider.startCrawl(options);
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onMutate: async () => {
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: true, error: null });
    },
    onError: (err: Error) => {
      queryClient.setQueryData(QueryKey.CrawlMeta, {
        busy: false,
        error: err.message,
      });
    },
  });

  const stop = useMutation({
    mutationFn: () => window.openspider.stopCrawl(),
  });

  const pause = useMutation({
    mutationFn: async () => {
      const result = await window.openspider.pauseCrawl();
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onSuccess: async () => {
      const state = await window.openspider.getCrawlState();
      queryClient.setQueryData(QueryKey.CrawlProgress, state.progress);
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: false, error: null });
    },
    onError: (err: Error) => {
      queryClient.setQueryData(QueryKey.CrawlMeta, {
        busy: false,
        error: err.message,
      });
    },
  });

  const resume = useMutation({
    mutationFn: async () => {
      const result = await window.openspider.resumeCrawl();
      if (!result.ok) throw new Error(result.error);
      return result;
    },
    onMutate: () => {
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: true, error: null });
    },
    onError: (err: Error) => {
      queryClient.setQueryData(QueryKey.CrawlMeta, {
        busy: false,
        error: err.message,
      });
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const result = await window.openspider.saveSession();
      if ('error' in result) throw new Error(result.error);
      return result;
    },
    onError: (err: Error) => {
      queryClient.setQueryData<CrawlMeta>(QueryKey.CrawlMeta, (prev) => ({
        busy: prev?.busy ?? false,
        error: err.message,
      }));
    },
  });

  const load = useMutation({
    mutationFn: async () => {
      const result = await window.openspider.loadSession();
      if (!result.ok) {
        if (result.error === 'Cancelled') return null;
        throw new Error(result.error);
      }
      return result.state;
    },
    onSuccess: (state) => {
      if (!state) return;
      queryClient.setQueryData(QueryKey.CrawlProgress, state.progress);
      queryClient.setQueryData(QueryKey.CrawlPages, state.pages);
      queryClient.setQueryData(QueryKey.CrawlIssues, state.issues);
    },
    onError: (err: Error) => {
      queryClient.setQueryData<CrawlMeta>(QueryKey.CrawlMeta, (prev) => ({
        busy: prev?.busy ?? false,
        error: err.message,
      }));
    },
  });

  return { start, stop, pause, resume, save, load };
}
