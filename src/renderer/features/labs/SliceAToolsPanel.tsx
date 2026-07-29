/** Slice A Labs tools — keyword mentions, sitemap extract, outbound broken links. */
import { memo, useMemo, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../i18n/I18nProvider';
import { QueryKey } from '../../lib/query-keys.const';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { useCrawlPages } from '../crawl/use-crawl-queries';
import { useProject } from '../projects/ProjectProvider';
import { parseKeywordInput, projectKeywords } from '../../../shared/utils/project-keywords.utils';
import type {
  KeywordMentionCell,
  KeywordMentionsResult,
  OutboundBrokenRow,
  OutboundLinksCheckResult,
} from '../../../shared/types/labs-tools.types';

function locationLabel(
  loc: string,
  t: (k: import('../../i18n/translate').MessageKey) => string,
): string {
  const key = `labs.mentions.loc.${loc}` as import('../../i18n/translate').MessageKey;
  return t(key);
}

function buildMentionsCsv(cells: KeywordMentionCell[]): string {
  const lines = ['keyword,page_url,locations'];
  for (const cell of cells) {
    const locs = cell.locations.join('|');
    const row = [
      `"${cell.keyword.replaceAll('"', '""')}"`,
      `"${cell.pageUrl.replaceAll('"', '""')}"`,
      `"${locs}"`,
    ];
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

export type SliceAToolId = 'mentions' | 'sitemap' | 'outbound';

export const SliceAToolsPanel = memo(function SliceAToolsPanel({
  tool = 'mentions',
}: {
  tool?: SliceAToolId;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { active } = useProject();
  const { data: pages = [] } = useCrawlPages();

  const defaultKeywords = useMemo(() => projectKeywords(active).join('\n'), [active]);
  const [keywordsText, setKeywordsText] = useState(defaultKeywords);
  const [scopeMode, setScopeMode] = useState<'all' | 'urls'>('all');
  const [scopeUrlsText, setScopeUrlsText] = useState('');
  const [mentions, setMentions] = useState<KeywordMentionsResult | null>(null);

  const [sitemapUrl, setSitemapUrl] = useState(
    active?.startUrl ? `${active.startUrl.replace(/\/$/, '')}/sitemap.xml` : 'https://example.com/sitemap.xml',
  );
  const [sitemapUrls, setSitemapUrls] = useState<string[]>([]);
  const [sitemapMessage, setSitemapMessage] = useState<string | null>(null);

  const [includeInternal, setIncludeInternal] = useState(false);
  const [outbound, setOutbound] = useState<OutboundLinksCheckResult | null>(null);

  const [busy, setBusy] = useState<'mentions' | 'sitemap' | 'outbound' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matrixRows = useMemo(() => {
    if (!mentions?.cells.length) return [];
    const byPage = new Map<string, KeywordMentionCell[]>();
    for (const cell of mentions.cells) {
      const list = byPage.get(cell.pageUrl) ?? [];
      list.push(cell);
      byPage.set(cell.pageUrl, list);
    }
    return [...byPage.entries()];
  }, [mentions]);

  const runMentions = async () => {
    setBusy('mentions');
    setError(null);
    try {
      const keywords = parseKeywordInput(keywordsText);
      const scopeUrls =
        scopeMode === 'urls'
          ? scopeUrlsText
              .split(/\n/)
              .map((u) => u.trim())
              .filter(Boolean)
          : undefined;
      const result = await window.openspider.checkKeywordMentions({ keywords, scopeUrls });
      if (result.error && !result.cells.length) setError(result.error);
      setMentions(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const runSitemapExtract = async () => {
    setBusy('sitemap');
    setError(null);
    setSitemapMessage(null);
    try {
      const result = await window.openspider.extractSitemapUrls({ sitemapUrl: sitemapUrl.trim() });
      if (result.error) setError(result.error);
      setSitemapUrls(result.urls);
      setSitemapMessage(t('labs.sitemapExtract.found', { count: result.count }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const runOutbound = async () => {
    setBusy('outbound');
    setError(null);
    try {
      const result = await window.openspider.checkOutboundLinks({
        externalOnly: true,
        includeInternalUncrawled: includeInternal,
      });
      if (result.error) setError(result.error);
      setOutbound(result);
      const state = await window.openspider.getCrawlState();
      queryClient.setQueryData(QueryKey.CrawlIssues, state.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSitemapMessage(t('labs.sitemapExtract.copied'));
    } catch {
      setError(t('labs.sitemapExtract.copyFailed'));
    }
  };

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {tool === 'mentions' ? (
      <article className="admin-panel flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.mentions.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.mentions.body')}</p>
        <label className="text-sm">
          <span className="admin-label">{t('labs.mentions.keywords')}</span>
          <textarea
            className="mt-1 min-h-[88px] w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2 py-2 font-mono text-xs"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder={t('labs.mentions.keywordsPh')}
          />
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mentions-scope"
              checked={scopeMode === 'all'}
              onChange={() => setScopeMode('all')}
            />
            {t('labs.mentions.scopeAll', { count: pages.length })}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mentions-scope"
              checked={scopeMode === 'urls'}
              onChange={() => setScopeMode('urls')}
            />
            {t('labs.mentions.scopeUrls')}
          </label>
        </div>
        {scopeMode === 'urls' ? (
          <label className="text-sm">
            <span className="admin-label">{t('labs.mentions.urlList')}</span>
            <textarea
              className="mt-1 min-h-[64px] w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2 py-2 font-mono text-xs"
              value={scopeUrlsText}
              onChange={(e) => setScopeUrlsText(e.target.value)}
              placeholder="https://example.com/page-a"
            />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" isDisabled={busy !== null} onPress={() => void runMentions()}>
            {busy === 'mentions' ? t('labs.mentions.running') : t('labs.mentions.cta')}
          </Button>
          {mentions?.cells.length ? (
            <Button
              variant="secondary"
              onPress={() => downloadCsv(buildMentionsCsv(mentions.cells), 'keyword-mentions.csv')}
            >
              {t('labs.mentions.exportCsv')}
            </Button>
          ) : null}
        </div>
        {mentions ? (
          <p className="text-xs text-[var(--os-muted)]">
            {t('labs.mentions.summary', {
              pages: mentions.pagesChecked,
              keywords: mentions.keywordsChecked,
              hits: mentions.cells.length,
            })}
          </p>
        ) : null}
        <div className="max-h-[28rem] overflow-auto border border-[var(--os-line)] text-xs">
          {!mentions?.cells.length ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.mentions.empty')}</div>
          ) : (
            matrixRows.map(([pageUrl, cells]) => (
              <div key={pageUrl} className="border-b border-[var(--os-line)] px-2 py-2">
                <AnalyzeUrl url={pageUrl} compact preferPage={false} />
                <ul className="mt-1 space-y-1 text-[var(--os-muted)]">
                  {cells.map((cell) => (
                    <li key={`${cell.keyword}-${pageUrl}`}>
                      <span className="font-medium text-[var(--os-fg)]">«{cell.keyword}»</span>
                      {' · '}
                      {cell.locations.map((loc) => locationLabel(loc, t)).join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </article>
      ) : null}

      {tool === 'sitemap' ? (
      <article className="admin-panel flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.sitemapExtract.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.sitemapExtract.body')}</p>
        <TextField value={sitemapUrl} onChange={setSitemapUrl}>
          <Label>{t('labs.sitemapExtract.url')}</Label>
          <Input data-testid="labs-sitemap-extract-url" />
        </TextField>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" isDisabled={busy !== null} onPress={() => void runSitemapExtract()}>
            {busy === 'sitemap' ? t('labs.sitemapExtract.running') : t('labs.sitemapExtract.cta')}
          </Button>
          {sitemapUrls.length > 0 ? (
            <>
              <Button variant="secondary" onPress={() => void copyText(sitemapUrls.join('\n'))}>
                {t('labs.sitemapExtract.copy')}
              </Button>
              <Button
                variant="secondary"
                onPress={() => downloadCsv(['url', ...sitemapUrls].join('\n'), 'sitemap-urls.csv')}
              >
                {t('labs.sitemapExtract.exportCsv')}
              </Button>
            </>
          ) : null}
        </div>
        {sitemapMessage ? <p className="text-xs text-[var(--os-muted)]">{sitemapMessage}</p> : null}
        <div className="max-h-[28rem] overflow-auto border border-[var(--os-line)] font-mono text-[11px]">
          {sitemapUrls.length === 0 ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.sitemapExtract.empty')}</div>
          ) : (
            sitemapUrls.map((u) => (
              <div key={u} className="border-b border-[var(--os-line)] px-2 py-1">
                {u}
              </div>
            ))
          )}
        </div>
      </article>
      ) : null}

      {tool === 'outbound' ? (
      <article className="admin-panel flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.outbound.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.outbound.body')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeInternal}
            onChange={(e) => setIncludeInternal(e.target.checked)}
          />
          {t('labs.outbound.includeInternal')}
        </label>
        <Button variant="primary" isDisabled={busy !== null} onPress={() => void runOutbound()}>
          {busy === 'outbound' ? t('labs.outbound.running') : t('labs.outbound.cta')}
        </Button>
        {outbound ? (
          <p className="text-xs text-[var(--os-muted)]">
            {t('labs.outbound.summary', {
              broken: outbound.broken.length,
              checked: outbound.checked,
              skipped: outbound.skipped,
              issues: outbound.issuesAdded,
            })}
          </p>
        ) : null}
        <div className="max-h-[28rem] overflow-auto border border-[var(--os-line)] text-xs">
          {!outbound?.broken.length ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.outbound.empty')}</div>
          ) : (
            outbound.broken.map((row: OutboundBrokenRow) => (
              <div key={row.targetUrl} className="border-b border-[var(--os-line)] px-2 py-2">
                <div className="font-mono text-[var(--os-fg)]">
                  {row.statusCode || 'ERR'} · {row.targetUrl}
                </div>
                {row.error ? <div className="mt-1 text-[var(--os-muted)]">{row.error}</div> : null}
                <ul className="mt-1 space-y-1 text-[var(--os-muted)]">
                  {row.sources.slice(0, 5).map((s) => (
                    <li key={`${row.targetUrl}-${s.url}`}>
                      {t('labs.outbound.from')}{' '}
                      <AnalyzeUrl url={s.url} compact preferPage={false} />
                      {s.anchor ? <> · «{s.anchor}»</> : null}
                    </li>
                  ))}
                  {row.sources.length > 5 ? (
                    <li>{t('labs.outbound.moreSources', { count: row.sources.length - 5 })}</li>
                  ) : null}
                </ul>
              </div>
            ))
          )}
        </div>
      </article>
      ) : null}

      {error ? (
        <div className="border border-[var(--os-line-strong)] px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
    </div>
  );
});
