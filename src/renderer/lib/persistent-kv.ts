/**
 * Persistent key/value for Neutralino + browser.
 * Neutralino.storage keys: ^[a-zA-Z-_0-9]{1,50}$ (no dots).
 * neu:dev may change origin/port → localStorage alone is unreliable.
 */

type NeuStorage = {
  getData: (key: string) => Promise<string>;
  setData: (key: string, data: string) => Promise<void>;
};

function neuStorage(): NeuStorage | null {
  if (typeof window === 'undefined') return null;
  const neu = (window as unknown as { Neutralino?: { storage?: NeuStorage } }).Neutralino;
  if (!neu?.storage?.getData || !neu?.storage?.setData) return null;
  return neu.storage;
}

/** Sync read — localStorage only (immediate UI). */
export function readLocalKv(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Sync write — localStorage; Neutralino.storage fire-and-forget. */
export function writeLocalKv(key: string, value: string, neuKey?: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
  const storage = neuStorage();
  if (!storage) return;
  const bucket = neuKey ?? key.replace(/\./g, '_').slice(0, 50);
  void storage.setData(bucket, value).catch(() => {
    /* missing key / invalid key / not ready */
  });
}

/** Prefer Neutralino.storage, fall back to localStorage. */
export async function readPersistentKv(key: string, neuKey?: string): Promise<string | null> {
  const bucket = neuKey ?? key.replace(/\./g, '_').slice(0, 50);
  const storage = neuStorage();
  if (storage) {
    try {
      const fromNeu = await storage.getData(bucket);
      if (typeof fromNeu === 'string' && fromNeu.length > 0) return fromNeu;
    } catch {
      /* NE_ST_NOSTKEX — key missing */
    }
  }
  return readLocalKv(key);
}
