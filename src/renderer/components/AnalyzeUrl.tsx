/**
 * Кликабельный URL для аналитики: браузер · копировать · карточка страницы.
 */
import { memo, useState, type MouseEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { openPageInCrawl } from '../lib/analyze-nav';
import { openInBrowser } from '../lib/open-external';
import type { NavSectionName } from '../app/routes.const';

interface AnalyzeUrlProps {
  url: string;
  /** Truncate display */
  compact?: boolean;
  /** Prefer opening page card when URL is from this crawl */
  preferPage?: boolean;
  onNavigate?: (section: NavSectionName) => void;
  /** Local open (same panel) instead of cross-nav */
  onOpenPage?: (url: string) => void;
  className?: string;
}

async function copyUrl(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    /* ignore */
  }
}

export const AnalyzeUrl = memo(function AnalyzeUrl({
  url,
  compact = false,
  preferPage = true,
  onNavigate,
  onOpenPage,
  className = '',
}: AnalyzeUrlProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const trimmed = url.trim();
  if (!trimmed) return <span className="text-[var(--os-faint)]">—</span>;

  const openPage = (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    if (onOpenPage) onOpenPage(trimmed);
    else openPageInCrawl(trimmed, onNavigate);
  };

  const openBrowser = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void openInBrowser(trimmed);
  };

  const doCopy = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    void copyUrl(trimmed).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };

  const onPrimary = (e: MouseEvent) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      void openInBrowser(trimmed);
      return;
    }
    if (preferPage) openPage(e);
    else void openInBrowser(trimmed);
  };

  return (
    <span className={`analyze-url ${compact ? 'analyze-url--compact' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="analyze-url__main"
        title={`${trimmed} · ${t('analyze.openBrowserHint')}`}
        onClick={onPrimary}
      >
        {trimmed}
      </button>
      <span className="analyze-url__actions">
        <button
          type="button"
          className="analyze-url__btn analyze-url__btn--browser"
          title={t('analyze.openBrowser')}
          aria-label={t('analyze.openBrowser')}
          onClick={openBrowser}
        >
          <span className="analyze-url__btn-icon" aria-hidden>
            ↗
          </span>
          <span className="analyze-url__btn-label">{t('analyze.openBrowserShort')}</span>
        </button>
        <button
          type="button"
          className="analyze-url__btn"
          title={copied ? t('analyze.copied') : t('analyze.copy')}
          aria-label={t('analyze.copy')}
          onClick={doCopy}
        >
          {copied ? '✓' : '⧉'}
        </button>
        <button
          type="button"
          className="analyze-url__btn"
          title={t('analyze.openPage')}
          aria-label={t('analyze.openPage')}
          onClick={openPage}
        >
          ◉
        </button>
      </span>
    </span>
  );
});
