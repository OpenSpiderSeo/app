/**
 * Синхронизация IPC → TanStack Query cache.
 * Сам компонент не рендерит UI — только пишет в cache (батч страниц).
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CrawledPage, CrawlState, SeoIssue } from '../../../shared/types/crawl.types';
import { QueryKey } from '../../lib/query-keys.const';
import { emptyCrawlState, emptyProgress, normalizeCrawlState, normalizeCrawledPage } from '../../../shared/utils/crawl-state.utils';
import { useProject } from '../projects/ProjectProvider';

const PAGE_FLUSH_MS = 400;
const PROGRESS_THROTTLE_MS = 250;
const STATE_SYNC_MS = 900;

export interface CrawlMeta {
  busy: boolean;
  error: string | null;
}

export const defaultCrawlMeta: CrawlMeta = { busy: false, error: null };

export function CrawlQuerySync() {
  const queryClient = useQueryClient();
  const { active } = useProject();
  const pendingPages = useRef(new Map<string, CrawledPage>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProgress = useRef<CrawlState['progress'] | null>(null);
  const projectId = active?.id;

  useEffect(() => {
    const api = window.openspider;
    if (!api) return;

    const applyState = (state: CrawlState) => {
      const normalized = normalizeCrawlState(state);
      queryClient.setQueryData(QueryKey.CrawlProgress, normalized.progress);
      queryClient.setQueryData(QueryKey.CrawlPages, normalized.pages);
      queryClient.setQueryData(QueryKey.CrawlIssues, normalized.issues);
    };

    const syncBusy = (status: string) => {
      const active =
        status === 'running' || status === 'pausing' || status === 'stopping';
      queryClient.setQueryData<CrawlMeta>(QueryKey.CrawlMeta, (prev) => ({
        busy: active,
        error: prev?.error ?? null,
      }));
    };

    const needsStateSync = (progress: CrawlState['progress']) => {
      const pages = queryClient.getQueryData<CrawledPage[]>(QueryKey.CrawlPages) ?? [];
      const issues = queryClient.getQueryData<SeoIssue[]>(QueryKey.CrawlIssues) ?? [];
      const issueTarget = progress.issueCount ?? issues.length;
      return (
        progress.fetched > pages.length ||
        issueTarget > issues.length ||
        (pages.length > 0 && progress.fetched === 0)
      );
    };

    const flushStateSync = () => {
      stateSyncTimer.current = null;
      void api.getCrawlState().then((state) => {
        applyState(state);
      }).catch(() => {
        /* ignore transient RPC errors during crawl */
      });
    };

    const scheduleStateSync = () => {
      if (stateSyncTimer.current != null) return;
      stateSyncTimer.current = setTimeout(flushStateSync, STATE_SYNC_MS);
    };

    const flushPages = () => {
      flushTimer.current = null;
      if (pendingPages.current.size === 0) return;
      const batch = pendingPages.current;
      pendingPages.current = new Map();

      queryClient.setQueryData<CrawledPage[]>(QueryKey.CrawlPages, (prev = []) => {
        if (prev.length === 0) return [...batch.values()];
        const byUrl = new Map(prev.map((p) => [p.url, p]));
        for (const [url, page] of batch) {
          byUrl.set(url, page);
        }
        return [...byUrl.values()];
      });
    };

    const scheduleFlush = () => {
      if (flushTimer.current != null) return;
      flushTimer.current = setTimeout(flushPages, PAGE_FLUSH_MS);
    };

    const flushProgress = () => {
      progressTimer.current = null;
      const progress = pendingProgress.current;
      if (!progress) return;
      pendingProgress.current = null;
      queryClient.setQueryData(QueryKey.CrawlProgress, progress);
      syncBusy(progress.status);
      if (needsStateSync(progress)) {
        scheduleStateSync();
      }
    };

    const scheduleProgress = (progress: CrawlState['progress']) => {
      pendingProgress.current = progress;
      if (progressTimer.current != null) return;
      progressTimer.current = setTimeout(flushProgress, PROGRESS_THROTTLE_MS);
    };

    const offProgress = api.onCrawlProgress((progress) => {
      scheduleProgress(progress);
    });

    const offPage = api.onCrawlPage((page) => {
      pendingPages.current.set(page.url, normalizeCrawledPage(page));
      scheduleFlush();
    });

    const offFinished = api.onCrawlFinished((state) => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      if (progressTimer.current) {
        clearTimeout(progressTimer.current);
        progressTimer.current = null;
      }
      if (stateSyncTimer.current) {
        clearTimeout(stateSyncTimer.current);
        stateSyncTimer.current = null;
      }
      pendingProgress.current = null;
      pendingPages.current.clear();
      applyState(state);
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: false, error: null });
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: QueryKey.HistoryList(projectId) });
      }
    });

    const offError = api.onCrawlError(({ message }) => {
      queryClient.setQueryData(QueryKey.CrawlMeta, { busy: false, error: message });
    });

    void api.getCrawlState().then((state) => {
      applyState(state);
      syncBusy(normalizeCrawlState(state).progress.status);
    }).catch(() => {
      applyState(emptyCrawlState());
    });

    if (!queryClient.getQueryData(QueryKey.CrawlProgress)) {
      applyState(emptyCrawlState());
    }

    // Poll while crawl is active — keeps queue/active honest if SSE stalls.
    const pollId = window.setInterval(() => {
      const progress = queryClient.getQueryData<CrawlState['progress']>(QueryKey.CrawlProgress);
      const meta = queryClient.getQueryData<CrawlMeta>(QueryKey.CrawlMeta);
      const status = progress?.status ?? 'idle';
      const active =
        Boolean(meta?.busy) ||
        status === 'running' ||
        status === 'pausing' ||
        status === 'stopping' ||
        status === 'paused';
      if (!active) return;
      void api.getCrawlState().then((state) => {
        applyState(state);
        syncBusy(normalizeCrawlState(state).progress.status);
      }).catch(() => {
        /* ignore */
      });
    }, 1000);

    return () => {
      offProgress();
      offPage();
      offFinished();
      offError();
      window.clearInterval(pollId);
      if (flushTimer.current) clearTimeout(flushTimer.current);
      if (progressTimer.current) clearTimeout(progressTimer.current);
      if (stateSyncTimer.current) clearTimeout(stateSyncTimer.current);
    };
  }, [queryClient, projectId]);

  return null;
}

export { emptyProgress };
