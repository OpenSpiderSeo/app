import type { SeoProject } from '../types/project.types';

/** Normalize + dedupe keyword list (legacy `keyword` + `keywords`). */
export function projectKeywords(project: Pick<SeoProject, 'keyword' | 'keywords'> | null | undefined): string[] {
  if (!project) return [];
  const raw = [
    ...(project.keywords ?? []),
    ...(project.keyword ? [project.keyword] : []),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const k = item.trim().replace(/\s+/g, ' ');
    if (!k) continue;
    const key = k.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(k);
  }
  return out;
}

export function mergeKeywords(existing: string[], incoming: string[]): string[] {
  return projectKeywords({ keywords: [...existing, ...incoming] });
}

/** Split paste/comma/newline input into keywords. */
export function parseKeywordInput(text: string): string[] {
  return text
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
