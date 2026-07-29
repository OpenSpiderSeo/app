/** Lookup fix instructions for issue codes (shared: renderer + PDF export). */
import type { LocaleCode } from '../const/locale.const';
import { issueFixEn } from './issue-fix.en';
import { issueFixRu } from './issue-fix.ru';

type FixField = 'title' | 'why' | 'how' | 'method' | 'better';

const catalogs = {
  en: issueFixEn,
  ru: issueFixRu,
} as const;

function fixKey(code: string, field: FixField): string {
  return `fix.${code}.${field}`;
}

export function getIssueFixText(
  locale: LocaleCode,
  code: string,
  field: FixField,
): string | null {
  const catalog = catalogs[locale] ?? catalogs.en;
  const key = fixKey(code, field);
  const value = catalog[key as keyof typeof catalog];
  return typeof value === 'string' ? value : null;
}

export function getIssueFixTitle(locale: LocaleCode, code: string): string {
  return getIssueFixText(locale, code, 'title') ?? code;
}
