/** Last full-audit result per project — React Query + persistent KV. */
import type { QueryClient } from '@tanstack/react-query';
import type { FullAuditResult } from '../../shared/types/audit.types';
import { QueryKey } from './query-keys.const';
import { readLocalKv, readPersistentKv, writeLocalKv } from './persistent-kv';

const LS_KEY = 'openspider.lastAudit';
const NEU_KEY = 'openspider_lastAudit';

type AuditMap = Record<string, FullAuditResult>;

function parseMap(raw: string | null): AuditMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as AuditMap;
  } catch {
    return {};
  }
}

export function readLastAuditSync(projectId: string): FullAuditResult | null {
  return parseMap(readLocalKv(LS_KEY))[projectId] ?? null;
}

export async function loadLastAudit(projectId: string): Promise<FullAuditResult | null> {
  const map = parseMap(await readPersistentKv(LS_KEY, NEU_KEY));
  return map[projectId] ?? null;
}

export function saveLastAudit(projectId: string, audit: FullAuditResult): void {
  const map = parseMap(readLocalKv(LS_KEY));
  map[projectId] = audit;
  const ids = Object.keys(map);
  if (ids.length > 8) {
    for (const id of ids.slice(0, ids.length - 8)) {
      delete map[id];
    }
  }
  writeLocalKv(LS_KEY, JSON.stringify(map), NEU_KEY);
}

/** Write disk cache + React Query so Dashboard / Metrics hydrate without re-running tools. */
export function publishLastAudit(
  queryClient: QueryClient,
  projectId: string,
  audit: FullAuditResult,
): void {
  saveLastAudit(projectId, audit);
  queryClient.setQueryData(QueryKey.LastAudit(projectId), audit);
}
