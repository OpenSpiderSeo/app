/** Поддерживаемые языки UI. */
export const Locale = {
  En: 'en',
  Ru: 'ru',
} as const;

export type LocaleCode = (typeof Locale)[keyof typeof Locale];

/** localStorage key (dots OK). Neutralino.storage uses LOCALE_NEU_STORAGE_KEY. */
export const LOCALE_STORAGE_KEY = 'openspider.locale';

/** Neutralino.storage bucket — must match ^[a-zA-Z-_0-9]{1,50}$ (no dots). */
export const LOCALE_NEU_STORAGE_KEY = 'openspider_locale';

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  [Locale.En]: 'English',
  [Locale.Ru]: 'Русский',
};
