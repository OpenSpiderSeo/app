/** Bridge: open Googlebot section in Analysis hub for a crawled URL. */
import { requestAnalysisSection } from '../../lib/analyze-nav';

const STORAGE_KEY = 'openspider:googlebot-url';
const EVENT = 'openspider:googlebot-open';

export function requestGooglebotView(url: string): void {
  const trimmed = url.trim();
  if (!trimmed) return;
  requestAnalysisSection('googlebot');
  try {
    sessionStorage.setItem(STORAGE_KEY, trimmed);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: trimmed }));
}

export function consumePendingGooglebotUrl(): string | null {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value) sessionStorage.removeItem(STORAGE_KEY);
    return value;
  } catch {
    return null;
  }
}

export function onGooglebotOpenRequest(handler: (url: string) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<string>).detail;
    if (typeof detail === 'string' && detail.trim()) handler(detail.trim());
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
