import { memo, useMemo, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import { useI18n } from '../../i18n/I18nProvider';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import type { AiScanResult } from '../../../shared/types/audit.types';
import { useCrawlPages } from '../crawl/use-crawl-queries';
import { buildPagePreview } from '../../../shared/utils/page-preview.utils';
import { PreviewCards } from '../preview/PreviewCards';

const PREVIEW_PATTERNS = /og:(title|image|description)|twitter:(title|image|card)|meta.*description/i;

export const CustomToolsPanel = memo(function CustomToolsPanel() {
  const { t } = useI18n();
  const { data: pages = [] } = useCrawlPages();
  const [pattern, setPattern] = useState('og:image');
  const [selector, setSelector] = useState('h1');
  const [script, setScript] = useState('return $("title").text().trim()');
  const [searchHits, setSearchHits] = useState<
    { url: string; matches: number; snippet: string }[]
  >([]);
  const [extractRows, setExtractRows] = useState<{ url: string; values: string[] }[]>([]);
  const [jsRows, setJsRows] = useState<{ url: string; result: unknown; error?: string }[]>([]);
  const [aiScan, setAiScan] = useState<AiScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageByUrl = useMemo(() => new Map(pages.map((p) => [p.url, p])), [pages]);
  const showPreviewCards = PREVIEW_PATTERNS.test(pattern) || PREVIEW_PATTERNS.test(selector);

  const renderUrlPreview = (url: string) => {
    const page = pageByUrl.get(url);
    if (!page) return null;
    return (
      <div className="mt-2">
        <PreviewCards data={buildPagePreview(page)} compact />
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {pages[0] ? (
        <article className="admin-panel flex flex-col gap-3 p-4 lg:col-span-2">
          <h3 className="font-display text-base font-semibold">{t('preview.toolsSample')}</h3>
          <p className="text-sm text-[var(--os-muted)]">
            <AnalyzeUrl url={pages[0].url} compact preferPage={false} />
          </p>
          <PreviewCards data={buildPagePreview(pages[0])} />
        </article>
      ) : null}

      <article className="admin-panel flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.search.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.search.body')}</p>
        <TextField value={pattern} onChange={setPattern}>
          <Label>{t('labs.search.pattern')}</Label>
          <Input />
        </TextField>
        <Button
          variant="primary"
          onPress={async () => {
            setError(null);
            const result = await window.openspider.searchHtml(pattern);
            if ('error' in result) {
              setError(result.error);
              setSearchHits([]);
              return;
            }
            setSearchHits(result);
          }}
        >
          {t('labs.search.cta')}
        </Button>
        <div className="max-h-[28rem] overflow-auto border border-[var(--os-line)] text-xs">
          {searchHits.length === 0 ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.search.empty')}</div>
          ) : (
            searchHits.map((h) => (
              <div key={h.url} className="border-b border-[var(--os-line)] px-2 py-2">
                <div className="min-w-0">
                  <span className="font-mono">{h.matches}× · </span>
                  <AnalyzeUrl url={h.url} compact preferPage={false} />
                </div>
                {!showPreviewCards ? (
                  <div className="mt-1 text-[var(--os-muted)]">{h.snippet}</div>
                ) : null}
                {showPreviewCards ? renderUrlPreview(h.url) : null}
              </div>
            ))
          )}
        </div>
      </article>

      <article className="admin-panel flex flex-col gap-3 p-4">
        <h3 className="font-display text-base font-semibold">{t('labs.extract.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.extract.body')}</p>
        <TextField value={selector} onChange={setSelector}>
          <Label>{t('labs.extract.selector')}</Label>
          <Input />
        </TextField>
        <Button
          variant="secondary"
          onPress={async () => {
            setError(null);
            const result = await window.openspider.extractCss(selector);
            if ('error' in result) {
              setError(result.error);
              setExtractRows([]);
              return;
            }
            setExtractRows(result);
          }}
        >
          {t('labs.extract.cta')}
        </Button>
        <div className="max-h-[28rem] overflow-auto border border-[var(--os-line)] text-xs">
          {extractRows.length === 0 ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.extract.empty')}</div>
          ) : (
            extractRows.map((r) => (
              <div key={r.url} className="border-b border-[var(--os-line)] px-2 py-2">
                <AnalyzeUrl url={r.url} compact preferPage={false} />
                {!showPreviewCards ? (
                  <div className="mt-1 text-[var(--os-muted)]">{r.values.join(' · ')}</div>
                ) : null}
                {showPreviewCards ? renderUrlPreview(r.url) : null}
              </div>
            ))
          )}
        </div>
      </article>

      <article className="admin-panel flex flex-col gap-3 p-4 lg:col-span-2">
        <h3 className="font-display text-base font-semibold">{t('labs.customJs.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.customJs.body')}</p>
        <label className="text-sm">
          <span className="admin-label">{t('labs.customJs.script')}</span>
          <textarea
            className="mt-1 min-h-[96px] w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2 py-2 font-mono text-xs"
            value={script}
            onChange={(e) => setScript(e.target.value)}
          />
        </label>
        <Button
          variant="primary"
          onPress={async () => {
            setError(null);
            const result = await window.openspider.runCustomJs(script);
            if ('error' in result) {
              setError(result.error);
              setJsRows([]);
              return;
            }
            setJsRows(result);
          }}
        >
          {t('labs.customJs.cta')}
        </Button>
        <div className="max-h-48 overflow-auto border border-[var(--os-line)] text-xs">
          {jsRows.length === 0 ? (
            <div className="p-3 text-[var(--os-muted)]">{t('labs.customJs.empty')}</div>
          ) : (
            jsRows.map((r) => (
              <div key={r.url} className="border-b border-[var(--os-line)] px-2 py-2">
                <AnalyzeUrl url={r.url} compact preferPage={false} />
                <div className="mt-1 text-[var(--os-muted)]">
                  {r.error ?? JSON.stringify(r.result)}
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="admin-panel flex flex-col gap-3 p-4 lg:col-span-2">
        <h3 className="font-display text-base font-semibold">{t('labs.aiScan.title')}</h3>
        <p className="text-sm text-[var(--os-muted)]">{t('labs.aiScan.body')}</p>
        <Button
          variant="secondary"
          isDisabled={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              const result = await window.openspider.runAiScan();
              setAiScan(result);
              if (result.error) setError(result.error);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t('labs.aiScan.running') : t('labs.aiScan.cta')}
        </Button>
        {aiScan?.tips.length ? (
          <ul className="space-y-2 text-sm">
            {aiScan.tips.map((tip) => (
              <li key={tip.title} className="border border-[var(--os-line)] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{tip.title}</span>
                  <span className="font-mono text-[10px] uppercase">{tip.priority}</span>
                </div>
                <p className="mt-1 text-[var(--os-muted)]">{tip.detail}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </article>

      {error ? (
        <div className="border border-[var(--os-line-strong)] px-3 py-2 text-sm lg:col-span-2">
          {error}
        </div>
      ) : null}
    </div>
  );
});
