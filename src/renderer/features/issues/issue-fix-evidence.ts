import type { LocaleCode } from '../../../shared/const/locale.const';
import type { IssueEvidence, LocalNapEntryEvidence } from '../../../shared/types/crawl.types';

function napFieldLine(
  locale: LocaleCode,
  field: 'telephone' | 'address' | 'name',
  present: boolean,
): string {
  const ru = { telephone: 'телефон', address: 'адрес', name: 'название' };
  const en = { telephone: 'telephone', address: 'address', name: 'name' };
  const label = locale === 'ru' ? ru[field] : en[field];
  const status =
    locale === 'ru'
      ? present
        ? 'есть'
        : 'нет'
      : present
        ? 'present'
        : 'missing';
  return `${label}: ${status}`;
}

function formatLocalNapEntry(locale: LocaleCode, entry: LocalNapEntryEvidence): string {
  const title =
    entry.businessName != null
      ? `${entry.schemaType} «${entry.businessName}»`
      : entry.schemaType;
  const fields = [
    napFieldLine(locale, 'telephone', entry.hasTelephone),
    napFieldLine(locale, 'address', entry.hasAddress),
    napFieldLine(locale, 'name', entry.hasName),
  ].join(', ');
  return `• ${title} — ${fields}`;
}

export function formatIssueEvidence(evidence: IssueEvidence, locale: LocaleCode): string {
  switch (evidence.kind) {
    case 'local_nap': {
      const intro =
        locale === 'ru'
          ? `На странице ${evidence.jsonLdBlockCount} блок(ов) application/ld+json. Найдены локальные типы без полного NAP:`
          : `${evidence.jsonLdBlockCount} application/ld+json block(s) on the page. Local schema types with incomplete NAP:`;
      const lines = evidence.entries.map((entry) => formatLocalNapEntry(locale, entry));
      return [intro, ...lines].join('\n');
    }
    case 'orphan': {
      return locale === 'ru'
        ? `Внутренних входящих ссылок при обходе: ${evidence.inlinks}. Глубина от стартового URL: ${evidence.depth}.`
        : `Internal inlinks discovered during crawl: ${evidence.inlinks}. Depth from start URL: ${evidence.depth}.`;
    }
    case 'outbound_broken': {
      const status = evidence.statusCode === 0 ? 'failed' : String(evidence.statusCode);
      const anchor = evidence.anchor ? ` · anchor: «${evidence.anchor}»` : '';
      const err = evidence.fetchError ? ` · ${evidence.fetchError}` : '';
      return locale === 'ru'
        ? `Цель: ${evidence.targetUrl} · HTTP ${status}${anchor}${err}`
        : `Target: ${evidence.targetUrl} · HTTP ${status}${anchor}${err}`;
    }
    default:
      return '';
  }
}
