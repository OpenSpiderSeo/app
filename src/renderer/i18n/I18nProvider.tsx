import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Locale,
  LOCALE_NEU_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  type LocaleCode,
} from '../../shared/const/locale.const';
import { readLocalKv, readPersistentKv, writeLocalKv } from '../lib/persistent-kv';
import { translate, type MessageKey } from './translate';

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null | undefined): value is LocaleCode {
  return value === Locale.En || value === Locale.Ru;
}

function detectInitialLocale(): LocaleCode {
  const saved = readLocalKv(LOCALE_STORAGE_KEY);
  if (isLocale(saved)) return saved;
  const lang = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  return lang.startsWith('ru') ? Locale.Ru : Locale.En;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(detectInitialLocale);

  // Neutralino.storage survives neu:dev origin/port changes; hydrate after ready.
  useEffect(() => {
    let cancelled = false;
    void readPersistentKv(LOCALE_STORAGE_KEY, LOCALE_NEU_STORAGE_KEY).then((saved) => {
      if (cancelled || !isLocale(saved)) return;
      setLocaleState((prev) => (prev === saved ? prev : saved));
      // Mirror into localStorage so next sync boot is correct.
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, saved);
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    writeLocalKv(LOCALE_STORAGE_KEY, next, LOCALE_NEU_STORAGE_KEY);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
