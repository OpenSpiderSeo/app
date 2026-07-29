/** RPC transport: Neutralino Go extension (primary) or HTTP sidecar (browser dev). */

import { API_BASE } from './api-base';

let rpcSeq = 0;
const pendingRpc = new Map<
  string,
  { resolve: (v: { status: number; body: unknown }) => void; reject: (e: Error) => void }
>();

type CrawlHandler = (type: string, data: unknown) => void;
const crawlHandlers = new Set<CrawlHandler>();

let goInitStarted = false;

function hasNeutralinoExtensions(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Neutralino' in window &&
    typeof (window as { Neutralino?: { extensions?: { dispatch?: unknown } } }).Neutralino?.extensions
      ?.dispatch === 'function'
  );
}

export function isExtensionMode(): boolean {
  return hasNeutralinoExtensions();
}

export function initExtensionTransport(): boolean {
  if (!hasNeutralinoExtensions() || goInitStarted) {
    return hasNeutralinoExtensions();
  }
  goInitStarted = true;

  const Neutralino = (window as unknown as {
    Neutralino: {
      events: { on: (e: string, h: (ev: Event) => void) => void };
    };
  }).Neutralino;

  Neutralino.events.on('rpcResult', (ev) => {
    const detail = (ev as CustomEvent).detail as {
      id?: string;
      status?: number;
      body?: unknown;
      error?: string;
    };
    const id = detail?.id;
    if (!id) return;
    const p = pendingRpc.get(id);
    if (!p) return;
    pendingRpc.delete(id);
    if (detail.error) {
      p.reject(new Error(detail.error));
      return;
    }
    p.resolve({ status: detail.status ?? 200, body: detail.body });
  });

  Neutralino.events.on('crawlEvent', (ev) => {
    const detail = (ev as CustomEvent).detail as { type?: string; data?: unknown };
    if (!detail?.type) return;
    for (const h of crawlHandlers) {
      h(detail.type, detail.data);
    }
  });

  if (typeof window.GoExtension !== 'function') {
    console.warn('[OpenSpider] go-extension.js not loaded — extension RPC unavailable');
    return false;
  }

  window.GO = new window.GoExtension(Boolean(import.meta.env?.DEV));

  return true;
}

export function subscribeCrawlEvents(handler: CrawlHandler): () => void {
  crawlHandlers.add(handler);
  return () => crawlHandlers.delete(handler);
}

async function extensionRpc(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs = 60_000,
): Promise<{ status: number; body: unknown }> {
  if (!window.GO) {
    initExtensionTransport();
  }
  const GO = window.GO;
  if (!GO) {
    throw new Error('Go extension not initialized');
  }

  const id = String(++rpcSeq);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRpc.delete(id);
      reject(new Error(`RPC timeout: ${method} ${path}`));
    }, timeoutMs);

    pendingRpc.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });

    void GO.run('rpc', { id, method, path, body: body ?? null });
  });
}

async function httpFetch(method: string, path: string, body?: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { status: res.status, body: data };
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  timeoutMs?: number,
): Promise<T> {
  const { status, body: respBody } = hasNeutralinoExtensions()
    ? await extensionRpc(method, path, body, timeoutMs ?? 60_000)
    : await httpFetch(method, path, body);

  const data = respBody as T & { message?: string; error?: string };
  if (status === 501) {
    throw new Error((data as { message?: string }).message ?? 'not_implemented');
  }
  if (status < 200 || status >= 300) {
    throw new Error(
      (data as { message?: string; error?: string }).message ??
        (data as { error?: string }).error ??
        `HTTP ${status}`,
    );
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>('GET', path);
}

export async function apiPost<T>(path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  return apiRequest<T>('POST', path, body, timeoutMs);
}

export async function checkEngineHealth(): Promise<boolean> {
  if (hasNeutralinoExtensions()) {
    try {
      const r = await extensionRpc('GET', '/api/health');
      return r.status === 200;
    } catch {
      return false;
    }
  }
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

interface GoExtension {
  run(f: string, p?: unknown): Promise<void>;
  stop(): Promise<void>;
  debug: boolean;
}

declare global {
  interface Window {
    GO?: GoExtension;
    GoExtension: new (debug?: boolean) => GoExtension;
  }
}
