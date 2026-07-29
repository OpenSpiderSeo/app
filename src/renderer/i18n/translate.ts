import type { LocaleCode } from '../../shared/const/locale.const';
import { en } from './messages.en';
import { ru } from './messages.ru';

export type MessageKey = keyof typeof en;

const catalogs: Record<LocaleCode, Record<MessageKey, string>> = {
  en,
  ru,
};

export function translate(
  locale: LocaleCode,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalog = catalogs[locale] ?? catalogs.en;
  let text = catalog[key] ?? catalogs.en[key] ?? String(key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}
