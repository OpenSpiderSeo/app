/** Crawl events: Neutralino extension broadcast or HTTP SSE fallback. */
import { API_BASE } from './api-base';
import { isExtensionMode, subscribeCrawlEvents } from './transport';

type Handler = (type: string, data: unknown) => void;

let source: EventSource | null = null;
const handlers = new Set<Handler>();

function ensureHttpSource(): void {
  if (source || isExtensionMode()) return;
  source = new EventSource(`${API_BASE}/api/events`);
  for (const event of ['progress', 'page', 'finished', 'error', 'connected'] as const) {
    source.addEventListener(event, (ev) => {
      const payload = (ev as MessageEvent).data;
      let data: unknown = payload;
      try {
        data = JSON.parse(payload);
      } catch {
        /* raw */
      }
      for (const h of handlers) {
        h(event, data);
      }
    });
  }
  source.onerror = () => {
    source?.close();
    source = null;
    setTimeout(() => {
      if (handlers.size > 0 && !isExtensionMode()) ensureHttpSource();
    }, 2000);
  };
}

export function connectCrawlEvents(handler: Handler): () => void {
  handlers.add(handler);

  if (isExtensionMode()) {
    return subscribeCrawlEvents(handler);
  }

  ensureHttpSource();
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      source?.close();
      source = null;
    }
  };
}
