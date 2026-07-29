/** Нормализация и сравнение URL для краулера. */

export function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const url = base ? new URL(raw, base) : new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    // Drop common tracking noise lightly
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'].forEach(
      (key) => url.searchParams.delete(key),
    );
    // /page/ and /page are the same resource for crawl dedup
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.href;
  } catch {
    return null;
  }
}

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isSameOrigin(a: string, b: string): boolean {
  const oa = originOf(a);
  const ob = originOf(b);
  return Boolean(oa && ob && oa === ob);
}
