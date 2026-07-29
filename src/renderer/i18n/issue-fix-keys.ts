import type { IssueCodeName } from '../../shared/types/crawl.types';
import { IssueCode } from '../../shared/types/crawl.types';
import type { MessageKey } from './translate';

const FIX_METHOD_CODES = new Set<IssueCodeName>([
  IssueCode.LocalNapIncomplete,
  IssueCode.OrphanPage,
]);

const FIX_BETTER_CODES = new Set<IssueCodeName>([IssueCode.LocalNapIncomplete]);

export function issueFixTitleKey(code: IssueCodeName): MessageKey {
  return `fix.${code}.title` as MessageKey;
}

export function issueFixWhyKey(code: IssueCodeName): MessageKey {
  return `fix.${code}.why` as MessageKey;
}

export function issueFixHowKey(code: IssueCodeName): MessageKey {
  return `fix.${code}.how` as MessageKey;
}

export function issueFixMethodKey(code: IssueCodeName): MessageKey | null {
  if (!FIX_METHOD_CODES.has(code)) return null;
  return `fix.${code}.method` as MessageKey;
}

export function issueFixBetterKey(code: IssueCodeName): MessageKey | null {
  if (!FIX_BETTER_CODES.has(code)) return null;
  return `fix.${code}.better` as MessageKey;
}
