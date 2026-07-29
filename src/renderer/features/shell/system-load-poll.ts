import { useEffect, useState } from 'react';
import type { SystemLoadSnapshot } from '../../../shared/types/ipc.types';
import { useCrawlMeta } from '../crawl/use-crawl-queries';

const POLL_IDLE_MS = 2500;
const POLL_BUSY_MS = 1000;

/** Polls main-process system load; mount once via SystemLoadProvider. */
export function useSystemLoadPoll(): SystemLoadSnapshot | null {
  const [load, setLoad] = useState<SystemLoadSnapshot | null>(null);
  const { data: meta } = useCrawlMeta();
  const pollMs = meta?.busy ? POLL_BUSY_MS : POLL_IDLE_MS;

  useEffect(() => {
    const api = window.openspider;
    if (!api?.getSystemLoad) return;

    let alive = true;
    const tick = async () => {
      try {
        const next = await api.getSystemLoad();
        if (alive) setLoad(next);
      } catch {
        /* ignore */
      }
    };

    void tick();
    const id = window.setInterval(() => void tick(), pollMs);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return load;
}
