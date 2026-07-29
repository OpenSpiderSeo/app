import { memo, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_CRAWL_OPTIONS } from '../../../shared/const/app.const';
import type { CrawlOptions, CrawlSegmentRule } from '../../../shared/types/crawl.types';
import { useI18n } from '../../i18n/I18nProvider';
import { useProject } from '../projects/ProjectProvider';

export type CrawlConfigValues = Omit<CrawlOptions, 'startUrl'>;

type CrawlMode = 'spider' | 'list';

function parseUrlList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatUrlList(list?: string[]): string {
  return (list ?? []).join('\n');
}

function parseSegments(text: string): CrawlSegmentRule[] {
  const rules: CrawlSegmentRule[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const pipe = trimmed.indexOf('|');
    if (pipe <= 0) continue;
    const name = trimmed.slice(0, pipe).trim();
    const pattern = trimmed.slice(pipe + 1).trim();
    if (name && pattern) rules.push({ name, pattern });
  }
  return rules;
}

function formatSegments(segments?: CrawlSegmentRule[]): string {
  return (segments ?? []).map((s) => `${s.name}|${s.pattern}`).join('\n');
}

function modeFromConfig(value: CrawlConfigValues): CrawlMode {
  return value.listMode ? 'list' : 'spider';
}

interface CrawlConfigPanelProps {
  value: CrawlConfigValues;
  onChange: (next: CrawlConfigValues) => void;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="crawl-config__section">
      <header className="crawl-config__section-head">
        <h3 className="crawl-config__section-title">{title}</h3>
        {hint ? <p className="crawl-config__section-hint">{hint}</p> : null}
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className={`crawl-config__toggle${checked ? ' is-on' : ''}`}>
      <input
        type="checkbox"
        className="crawl-config__toggle-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="crawl-config__toggle-switch" aria-hidden />
      <span className="crawl-config__toggle-copy">
        <span className="crawl-config__toggle-label">{label}</span>
        {hint ? <span className="crawl-config__toggle-hint">{hint}</span> : null}
      </span>
    </label>
  );
}

export const CrawlConfigPanel = memo(function CrawlConfigPanel({
  value,
  onChange,
}: CrawlConfigPanelProps) {
  const { t } = useI18n();
  const mode = modeFromConfig(value);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const set = <K extends keyof CrawlConfigValues>(key: K, v: CrawlConfigValues[K]) => {
    onChange({ ...value, [key]: v });
  };

  const setMode = (next: CrawlMode) => {
    if (next === 'list') {
      onChange({ ...value, listMode: true, followLinks: false });
      return;
    }
    onChange({ ...value, listMode: false, followLinks: true });
  };

  const field =
    'crawl-config__input mt-1.5 w-full border border-[var(--os-line)] bg-[var(--os-panel)] px-2.5 py-2 text-sm';

  const textarea =
    'crawl-config__input mt-1.5 w-full min-h-[96px] resize-y border border-[var(--os-line)] bg-[var(--os-panel)] px-2.5 py-2 font-mono text-xs leading-relaxed';

  return (
    <div className="admin-panel crawl-config">
      <Section title={t('config.modeTitle')} hint={t('config.modeHint')}>
        <div className="crawl-config__modes" role="radiogroup" aria-label={t('config.modeTitle')}>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'spider'}
            className={`crawl-config__mode${mode === 'spider' ? ' is-active' : ''}`}
            onClick={() => setMode('spider')}
          >
            <span className="crawl-config__mode-title">{t('config.modeSpider')}</span>
            <span className="crawl-config__mode-body">{t('config.modeSpiderHint')}</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'list'}
            className={`crawl-config__mode${mode === 'list' ? ' is-active' : ''}`}
            onClick={() => setMode('list')}
          >
            <span className="crawl-config__mode-title">{t('config.modeList')}</span>
            <span className="crawl-config__mode-body">{t('config.modeListHint')}</span>
          </button>
        </div>
      </Section>

      {mode === 'list' ? (
        <Section title={t('config.urlList')} hint={t('config.urlListHelp')}>
          <textarea
            className={textarea}
            value={formatUrlList(value.urlList)}
            placeholder={t('config.urlListHint')}
            onChange={(e) => set('urlList', parseUrlList(e.target.value))}
          />
        </Section>
      ) : (
        <Section title={t('config.scopeTitle')} hint={t('config.scopeHint')}>
          <div className="crawl-config__toggles">
            <ToggleRow
              checked={value.followLinks !== false}
              onChange={(v) => set('followLinks', v)}
              label={t('config.followLinks')}
              hint={t('config.followLinksHint')}
            />
            <ToggleRow
              checked={value.seedFromSitemap !== false}
              onChange={(v) => set('seedFromSitemap', v)}
              label={t('config.sitemap')}
              hint={t('config.sitemapHint')}
            />
            <ToggleRow
              checked={value.sameOriginOnly !== false}
              onChange={(v) => set('sameOriginOnly', v)}
              label={t('config.sameOrigin')}
              hint={t('config.sameOriginHint')}
            />
            <ToggleRow
              checked={value.respectRobotsTxt !== false}
              onChange={(v) => set('respectRobotsTxt', v)}
              label={t('config.robots')}
              hint={t('config.robotsHint')}
            />
          </div>
        </Section>
      )}

      <Section title={t('config.collectTitle')} hint={t('config.collectHint')}>
        <div className="crawl-config__toggles">
          <ToggleRow
            checked={value.storeHtml !== false}
            onChange={(v) => set('storeHtml', v)}
            label={t('config.storeHtml')}
            hint={t('config.storeHtmlHint')}
          />
          <ToggleRow
            checked={Boolean(value.renderJs)}
            onChange={(v) => set('renderJs', v)}
            label={t('config.renderJs')}
            hint={t('config.renderJsHint')}
          />
        </div>
      </Section>

      <Section title={t('config.limitsTitle')} hint={t('config.limitsHint')}>
        <div className="crawl-config__limits">
          <label className="text-sm">
            <span className="admin-label">{t('config.depth')}</span>
            <input
              className={field}
              type="number"
              min={0}
              max={50}
              value={value.maxDepth ?? DEFAULT_CRAWL_OPTIONS.maxDepth}
              onChange={(e) => set('maxDepth', Number(e.target.value) || 0)}
            />
          </label>
          <label className="text-sm">
            <span className="admin-label">{t('config.concurrency')}</span>
            <input
              className={field}
              type="number"
              min={1}
              max={32}
              value={value.maxConcurrency ?? DEFAULT_CRAWL_OPTIONS.maxConcurrency}
              onChange={(e) => set('maxConcurrency', Number(e.target.value) || 1)}
            />
          </label>
          <label className="text-sm">
            <span className="admin-label">{t('config.timeout')}</span>
            <input
              className={field}
              type="number"
              min={3000}
              step={1000}
              value={value.requestTimeoutMs ?? DEFAULT_CRAWL_OPTIONS.requestTimeoutMs}
              onChange={(e) => set('requestTimeoutMs', Number(e.target.value) || 5000)}
            />
          </label>
        </div>
        <p className="crawl-config__footnote">{t('config.unlimitedHint')}</p>
      </Section>

      <details
        className="crawl-config__advanced"
        open={advancedOpen}
        onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="crawl-config__advanced-summary">{t('config.advanced')}</summary>
        <div className="crawl-config__advanced-body">
          {mode === 'spider' ? (
            <label className="text-sm block">
              <span className="admin-label">{t('config.urlListExtra')}</span>
              <span className="crawl-config__field-hint">{t('config.urlListExtraHelp')}</span>
              <textarea
                className={textarea}
                value={formatUrlList(value.urlList)}
                placeholder={t('config.urlListHint')}
                onChange={(e) => set('urlList', parseUrlList(e.target.value))}
              />
            </label>
          ) : (
            <div className="crawl-config__toggles">
              <ToggleRow
                checked={value.sameOriginOnly !== false}
                onChange={(v) => set('sameOriginOnly', v)}
                label={t('config.sameOrigin')}
              />
              <ToggleRow
                checked={value.respectRobotsTxt !== false}
                onChange={(v) => set('respectRobotsTxt', v)}
                label={t('config.robots')}
              />
            </div>
          )}
          <label className="text-sm block">
            <span className="admin-label">{t('config.userAgent')}</span>
            <input
              className={field}
              value={value.userAgent ?? DEFAULT_CRAWL_OPTIONS.userAgent}
              onChange={(e) => set('userAgent', e.target.value)}
            />
          </label>
          <label className="text-sm block">
            <span className="admin-label">{t('config.segments')}</span>
            <span className="crawl-config__field-hint">{t('config.segmentsHelp')}</span>
            <textarea
              className={textarea}
              value={formatSegments(value.segments)}
              placeholder={t('config.segmentsHint')}
              onChange={(e) => set('segments', parseSegments(e.target.value))}
            />
          </label>
        </div>
      </details>
    </div>
  );
});

export function useCrawlConfigState() {
  const { active } = useProject();
  const [config, setConfig] = useState<CrawlConfigValues>({ ...DEFAULT_CRAWL_OPTIONS });

  useEffect(() => {
    if (!window.openspider) return;
    void window.openspider
      .getCrawlConfig()
      .then((c) => {
        setConfig({ ...DEFAULT_CRAWL_OPTIONS, ...c });
      })
      .catch(() => {
        setConfig({ ...DEFAULT_CRAWL_OPTIONS });
      });
  }, [active?.id]);

  const persist = async (next: CrawlConfigValues) => {
    setConfig(next);
    try {
      await window.openspider.saveCrawlConfig(next);
    } catch {
      /* main process not ready / old build — keep UI state */
    }
  };

  return { config, setConfig: persist };
}
