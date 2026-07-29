/**
 * Список ключей проекта: заданные при создании + добавленные после обхода.
 * Подсказки — из topKeywords страниц краула.
 */
import { useMemo, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import { useCrawlPages } from '../crawl/use-crawl-queries';
import { useProject } from './ProjectProvider';
import {
  mergeKeywords,
  parseKeywordInput,
  projectKeywords,
} from '../../../shared/utils/project-keywords.utils';

interface ProjectKeywordsEditorProps {
  /** Currently selected keyword for SERP (optional). */
  selected?: string;
  onSelect?: (keyword: string) => void;
  compact?: boolean;
}

export function ProjectKeywordsEditor({
  selected,
  onSelect,
  compact = false,
}: ProjectKeywordsEditorProps) {
  const { t } = useI18n();
  const { active, updateProject } = useProject();
  const { data: pages = [] } = useCrawlPages();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const keywords = useMemo(() => projectKeywords(active), [active]);

  const suggestions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const page of pages) {
      for (const kw of page.topKeywords ?? []) {
        const n = kw.trim();
        if (!n) continue;
        const key = n.toLowerCase();
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const existing = new Set(keywords.map((k) => k.toLowerCase()));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => {
        // restore original casing from first page hit
        for (const page of pages) {
          const hit = (page.topKeywords ?? []).find((x) => x.trim().toLowerCase() === k);
          if (hit) return hit.trim();
        }
        return k;
      })
      .filter((k) => !existing.has(k.toLowerCase()))
      .slice(0, 12);
  }, [pages, keywords]);

  if (!active) return null;

  const persist = async (next: string[]) => {
    setBusy(true);
    try {
      await updateProject(active.id, {
        keywords: next,
        keyword: next[0],
      });
    } finally {
      setBusy(false);
    }
  };

  const addFromDraft = async () => {
    const parsed = parseKeywordInput(draft);
    if (parsed.length === 0) return;
    const next = mergeKeywords(keywords, parsed);
    await persist(next);
    setDraft('');
    if (onSelect && parsed[0]) onSelect(parsed[0]);
  };

  const remove = async (kw: string) => {
    const next = keywords.filter((k) => k.toLowerCase() !== kw.toLowerCase());
    await persist(next);
    if (selected && selected.toLowerCase() === kw.toLowerCase() && onSelect) {
      onSelect(next[0] ?? '');
    }
  };

  const addSuggestion = async (kw: string) => {
    const next = mergeKeywords(keywords, [kw]);
    await persist(next);
    onSelect?.(kw);
  };

  return (
    <div className={`kw-editor ${compact ? 'kw-editor--compact' : ''}`}>
      {!compact ? (
        <>
          <div className="admin-label">{t('keywords.title')}</div>
          <p className="kw-editor__hint">{t('keywords.hint')}</p>
        </>
      ) : null}

      <div className="kw-chips">
        {keywords.length === 0 ? (
          <span className="kw-editor__empty">{t('keywords.empty')}</span>
        ) : (
          keywords.map((kw) => {
            const isActive = selected?.toLowerCase() === kw.toLowerCase();
            return (
              <span
                key={kw}
                className={`kw-chip ${isActive ? 'kw-chip--active' : ''} ${onSelect ? 'kw-chip--pick' : ''}`}
              >
                <button
                  type="button"
                  className="kw-chip__label"
                  onClick={() => onSelect?.(kw)}
                  disabled={!onSelect}
                >
                  {kw}
                </button>
                <button
                  type="button"
                  className="kw-chip__x"
                  aria-label={t('keywords.remove')}
                  disabled={busy}
                  onClick={() => void remove(kw)}
                >
                  ×
                </button>
              </span>
            );
          })
        )}
      </div>

      <div className="kw-editor__add">
        <TextField value={draft} onChange={setDraft} className="flex-1">
          <Label>{t('keywords.add')}</Label>
          <Input
            placeholder={t('keywords.addPh')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void addFromDraft();
              }
            }}
          />
        </TextField>
        <Button
          variant="primary"
          className="kw-editor__add-btn"
          isDisabled={busy || !draft.trim()}
          onPress={() => void addFromDraft()}
        >
          {t('keywords.addBtn')}
        </Button>
      </div>

      {suggestions.length > 0 ? (
        <div className="kw-suggest">
          <div className="admin-label">{t('keywords.fromCrawl')}</div>
          <div className="kw-chips">
            {suggestions.map((kw) => (
              <button
                key={kw}
                type="button"
                className="kw-chip kw-chip--suggest"
                disabled={busy}
                onClick={() => void addSuggestion(kw)}
              >
                + {kw}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
