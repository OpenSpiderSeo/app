import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input, Label, TextField } from '@heroui/react';
import {
  DEFAULT_COMPARE_LANGUAGES,
  FETCH_AS_BOT_LANGUAGES,
  FETCH_AS_BOT_PROFILES,
  FetchAsBotProfile,
  type FetchAsBotProfileId,
} from './fetch-as-bot.const';
import type { GooglebotViewResult } from '../../../shared/types/ipc.types';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { useCrawlPages } from '../crawl/use-crawl-queries';
import { useProject } from '../projects/ProjectProvider';
import {
  consumePendingGooglebotUrl,
  onGooglebotOpenRequest,
} from './googlebot-nav';

type Mode = 'single' | 'compare' | 'languages';

function langLabelKey(id: string): MessageKey {
  return `googlebot.lang.${id}` as MessageKey;
}

function ResultCard({
  result,
  t,
  onOpenHreflang,
}: {
  result: GooglebotViewResult;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  onOpenHreflang?: (href: string) => void;
}) {
  const deviceLabel =
    result.device === 'mobile' ? t('googlebot.deviceMobile') : t('googlebot.deviceDesktop');
  const acceptLanguage = result.acceptLanguage ?? '';
  const hreflang = result.hreflang ?? [];
  const robotsTxt = result.robotsTxt ?? {
    url: '',
    fetched: false,
    allowed: null,
    note: '—',
  };
  const langChip = result.languageId
    ? t(langLabelKey(result.languageId))
    : acceptLanguage.split(',')[0]?.trim() || 'lang';

  return (
    <div className="googlebot-view__column">
      <div className="googlebot-view__meta admin-panel p-4">
        <div className="googlebot-view__chips">
          {result.languageId ? (
            <span className="googlebot-view__chip is-device">{langChip}</span>
          ) : (
            <span className="googlebot-view__chip is-device">{deviceLabel}</span>
          )}
          <span className="googlebot-view__chip">HTTP {result.statusCode}</span>
          {result.htmlLang ? (
            <span className="googlebot-view__chip">html lang={result.htmlLang}</span>
          ) : (
            <span className="googlebot-view__chip is-bad">{t('googlebot.chip.noHtmlLang')}</span>
          )}
          {result.contentLanguage ? (
            <span className="googlebot-view__chip">CL: {result.contentLanguage}</span>
          ) : null}
          <span className="googlebot-view__chip">{result.viewportWidth}px</span>
          {result.noindex ? (
            <span className="googlebot-view__chip is-bad">{t('googlebot.chip.noindex')}</span>
          ) : (
            <span className="googlebot-view__chip is-ok">{t('googlebot.chip.indexable')}</span>
          )}
          {robotsTxt.allowed === false ? (
            <span className="googlebot-view__chip is-bad">{t('googlebot.chip.robotsDisallow')}</span>
          ) : (
            <span className="googlebot-view__chip is-ok">{t('googlebot.chip.robotsOk')}</span>
          )}
          {hreflang.length > 0 ? (
            <span className="googlebot-view__chip is-ok">
              {t('googlebot.chip.hreflangCount', { count: hreflang.length })}
            </span>
          ) : (
            <span className="googlebot-view__chip">{t('googlebot.chip.noHreflang')}</span>
          )}
          {hreflang.length > 0 && !result.hreflangHasSelf ? (
            <span className="googlebot-view__chip is-bad">{t('googlebot.chip.noSelfHreflang')}</span>
          ) : null}
          {hreflang.length > 0 && result.hreflangHasXDefault ? (
            <span className="googlebot-view__chip is-ok">{t('googlebot.chip.xDefault')}</span>
          ) : null}
          <span className="googlebot-view__chip">
            {result.wordCount} {t('googlebot.words')}
          </span>
        </div>
        <dl className="googlebot-view__facts">
          <div>
            <dt>{t('googlebot.finalUrl')}</dt>
            <dd className="font-mono text-xs break-all">{result.finalUrl}</dd>
          </div>
          <div>
            <dt>{t('googlebot.field.acceptLanguage')}</dt>
            <dd className="font-mono text-xs break-all">{acceptLanguage || '—'}</dd>
          </div>
          <div>
            <dt>{t('googlebot.field.userAgent')}</dt>
            <dd className="font-mono text-xs break-all">{result.userAgent}</dd>
          </div>
          <div>
            <dt>{t('googlebot.field.robotsTxt')}</dt>
            <dd className="text-sm">{robotsTxt.note}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-[var(--os-faint)]">{result.note}</p>
      </div>

      <article className="googlebot-view__doc admin-panel mt-3 p-5">
        <p className="admin-label">{t('googlebot.docLabel')}</p>
        <h2 className="googlebot-view__title">{result.title || t('googlebot.noTitle')}</h2>
        {result.metaDescription ? (
          <p className="googlebot-view__desc">{result.metaDescription}</p>
        ) : (
          <p className="googlebot-view__desc is-missing">{t('googlebot.noDesc')}</p>
        )}

        <div className="googlebot-view__seo-row">
          <div>
            <span className="admin-label">{t('googlebot.field.canonical')}</span>
            <div className="font-mono text-xs break-all">{result.canonical || '—'}</div>
          </div>
          <div>
            <span className="admin-label">{t('googlebot.field.robots')}</span>
            <div className="font-mono text-xs">{result.robotsMeta || '—'}</div>
          </div>
          <div>
            <span className="admin-label">{t('googlebot.field.lang')}</span>
            <div className="font-mono text-xs">{result.htmlLang || '—'}</div>
          </div>
        </div>

        <h3 className="googlebot-view__section">{t('googlebot.hreflang')}</h3>
        {hreflang.length === 0 ? (
          <p className="text-sm text-[var(--os-muted)]">{t('googlebot.hreflangEmpty')}</p>
        ) : (
          <ul className="googlebot-view__hreflang">
            {hreflang.map((ref) => (
              <li key={`${ref.lang}-${ref.href}`}>
                <span className="googlebot-view__h-tag">{ref.lang}</span>
                {onOpenHreflang ? (
                  <button
                    type="button"
                    className="googlebot-view__href-btn"
                    onClick={() => onOpenHreflang(ref.href)}
                  >
                    {ref.href}
                  </button>
                ) : (
                  <span className="font-mono text-xs break-all">{ref.href}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <h3 className="googlebot-view__section">{t('googlebot.headings')}</h3>
        {(result.headings ?? []).length === 0 ? (
          <p className="text-sm text-[var(--os-muted)]">{t('googlebot.noHeadings')}</p>
        ) : (
          <ul className="googlebot-view__headings">
            {(result.headings ?? []).map((h, i) => (
              <li key={`${h.level}-${i}`} className={`is-h${h.level}`}>
                <span className="googlebot-view__h-tag">H{h.level}</span>
                {h.text}
              </li>
            ))}
          </ul>
        )}

        <h3 className="googlebot-view__section">{t('googlebot.text')}</h3>
        <pre className="googlebot-view__text">{result.textPreview || '—'}</pre>

        <h3 className="googlebot-view__section">
          {t('googlebot.links')} ({(result.links ?? []).length})
        </h3>
        <ul className="googlebot-view__links">
          {(result.links ?? []).map((link) => (
            <li key={link} className="font-mono text-xs break-all">
              {link}
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function shortPath(url: string): string {
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}` || '/';
    return path.length > 48 ? `${path.slice(0, 47)}…` : path;
  } catch {
    return url.slice(0, 48);
  }
}

export const GooglebotPanel = memo(function GooglebotPanel({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const { active } = useProject();
  const { data: pages = [] } = useCrawlPages();
  const [url, setUrl] = useState(active?.startUrl ?? 'https://');
  const [pageFilter, setPageFilter] = useState('');
  const [mode, setMode] = useState<Mode>('compare');
  const [profile, setProfile] = useState<FetchAsBotProfileId>(
    FetchAsBotProfile.GooglebotDesktop,
  );
  const [customUa, setCustomUa] = useState('');
  const [selectedLangs, setSelectedLangs] = useState<string[]>([...DEFAULT_COMPARE_LANGUAGES]);
  const [singleLang, setSingleLang] = useState('ru');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [views, setViews] = useState<GooglebotViewResult[]>([]);
  const modeRef = useRef(mode);
  const profileRef = useRef(profile);
  const customUaRef = useRef(customUa);
  const selectedLangsRef = useRef(selectedLangs);
  const singleLangRef = useRef(singleLang);
  modeRef.current = mode;
  profileRef.current = profile;
  customUaRef.current = customUa;
  selectedLangsRef.current = selectedLangs;
  singleLangRef.current = singleLang;

  const PROFILE_LABEL: Record<FetchAsBotProfileId, MessageKey> = {
    [FetchAsBotProfile.GooglebotDesktop]: 'googlebot.profile.googlebotDesktop',
    [FetchAsBotProfile.GooglebotSmart]: 'googlebot.profile.googlebotSmart',
    [FetchAsBotProfile.ChromeDesktop]: 'googlebot.profile.chromeDesktop',
    [FetchAsBotProfile.ChromeMobile]: 'googlebot.profile.chromeMobile',
    [FetchAsBotProfile.Custom]: 'googlebot.profile.custom',
  };

  const crawlPages = useMemo(() => {
    const q = pageFilter.trim().toLowerCase();
    const list = [...pages].sort((a, b) => a.url.localeCompare(b.url));
    if (!q) return list;
    return list.filter(
      (p) =>
        p.url.toLowerCase().includes(q) ||
        (p.title ?? '').toLowerCase().includes(q),
    );
  }, [pages, pageFilter]);

  const selectedPresetUa = useMemo(() => {
    if (profile === FetchAsBotProfile.Custom) return customUa;
    return FETCH_AS_BOT_PROFILES.find((p) => p.id === profile)?.userAgent ?? '';
  }, [profile, customUa]);

  const runForUrl = useCallback(async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    setBusy(true);
    setError(null);
    try {
      const currentMode = modeRef.current;
      const currentProfile = profileRef.current;
      const single = FETCH_AS_BOT_LANGUAGES.find((l) => l.id === singleLangRef.current);
      const response = await window.openspider.fetchGooglebotView({
        url: trimmed,
        compareDesktopMobile: currentMode === 'compare',
        compareLanguages: currentMode === 'languages' ? selectedLangsRef.current : undefined,
        profile: currentMode === 'single' ? currentProfile : undefined,
        userAgent:
          currentMode === 'single' && currentProfile === FetchAsBotProfile.Custom
            ? customUaRef.current
            : undefined,
        acceptLanguage:
          currentMode === 'single' || currentMode === 'compare'
            ? single?.acceptLanguage
            : undefined,
      });
      setViews(response.views);
    } catch (err) {
      setViews([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleLang = (id: string) => {
    setSelectedLangs((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  useEffect(() => {
    const pending = consumePendingGooglebotUrl();
    if (pending) {
      void runForUrl(pending);
      return;
    }
    if (active?.startUrl) setUrl(active.startUrl);
  }, [active?.id, active?.startUrl, runForUrl]);

  useEffect(() => onGooglebotOpenRequest((next) => void runForUrl(next)), [runForUrl]);

  return (
    <section
      className={`googlebot-layout flex min-h-0 flex-col gap-4${embedded ? ' googlebot-layout--embedded' : ' h-full'}`}
    >
      {!embedded ? (
        <header className="max-w-3xl">
          <p className="admin-label">{t('nav.group.work')}</p>
          <h1 className="font-display mt-1 text-2xl font-semibold">{t('googlebot.title')}</h1>
          <p className="mt-1 text-sm text-[var(--os-muted)]">{t('googlebot.subtitle')}</p>
        </header>
      ) : null}

      <div className="googlebot-layout__body min-h-0 flex-1">
        <aside className="googlebot-pages admin-panel flex min-h-0 flex-col">
          <div className="googlebot-pages__head">
            <p className="admin-label">{t('googlebot.pagesTitle')}</p>
            <p className="googlebot-pages__count">
              {pages.length
                ? t('googlebot.pagesCount', { count: pages.length })
                : t('googlebot.pagesEmpty')}
            </p>
            {pages.length > 0 ? (
              <input
                className="googlebot-pages__filter"
                value={pageFilter}
                onChange={(e) => setPageFilter(e.target.value)}
                placeholder={t('googlebot.pagesFilter')}
              />
            ) : null}
          </div>
          <div className="googlebot-pages__list min-h-0 flex-1 overflow-auto">
            {crawlPages.map((page) => {
              const selected = page.url === url;
              return (
                <button
                  key={page.url}
                  type="button"
                  className={`googlebot-pages__item${selected ? ' is-active' : ''}`}
                  disabled={busy}
                  onClick={() => void runForUrl(page.url)}
                  title={page.url}
                >
                  <span className="googlebot-pages__status">{page.statusCode || '—'}</span>
                  <span className="googlebot-pages__meta">
                    <span className="googlebot-pages__path">{shortPath(page.url)}</span>
                    <span className="googlebot-pages__title">
                      {page.title || t('googlebot.noTitle')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="googlebot-layout__main min-h-0 flex min-w-0 flex-col gap-4">
          <div className="admin-panel flex flex-col gap-4 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <TextField className="min-w-[280px] flex-1" value={url} onChange={setUrl}>
                <Label>{t('googlebot.url')}</Label>
                <Input placeholder="https://example.com/page" />
              </TextField>
              <Button
                variant="primary"
                isDisabled={busy || !url.trim()}
                onPress={() => void runForUrl(url)}
              >
                {busy ? t('googlebot.loading') : t('googlebot.run')}
              </Button>
            </div>

            <div>
              <p className="admin-label">{t('googlebot.mode')}</p>
              <div className="googlebot-view__modes mt-2 googlebot-view__modes--3">
                <button
                  type="button"
                  className={`googlebot-view__mode${mode === 'compare' ? ' is-active' : ''}`}
                  onClick={() => setMode('compare')}
                >
                  <span className="googlebot-view__mode-title">{t('googlebot.modeCompare')}</span>
                  <span className="googlebot-view__mode-body">{t('googlebot.modeCompareHint')}</span>
                </button>
                <button
                  type="button"
                  className={`googlebot-view__mode${mode === 'languages' ? ' is-active' : ''}`}
                  onClick={() => setMode('languages')}
                >
                  <span className="googlebot-view__mode-title">{t('googlebot.modeLanguages')}</span>
                  <span className="googlebot-view__mode-body">{t('googlebot.modeLanguagesHint')}</span>
                </button>
                <button
                  type="button"
                  className={`googlebot-view__mode${mode === 'single' ? ' is-active' : ''}`}
                  onClick={() => setMode('single')}
                >
                  <span className="googlebot-view__mode-title">{t('googlebot.modeSingle')}</span>
                  <span className="googlebot-view__mode-body">{t('googlebot.modeSingleHint')}</span>
                </button>
              </div>
            </div>

            {mode === 'languages' || mode === 'compare' || mode === 'single' ? (
              <div>
                <p className="admin-label">
                  {mode === 'languages' ? t('googlebot.langsCompare') : t('googlebot.lang')}
                </p>
                <div className="googlebot-view__lang-list mt-2">
                  {FETCH_AS_BOT_LANGUAGES.map((lang) => {
                    const activeChip =
                      mode === 'languages'
                        ? selectedLangs.includes(lang.id)
                        : singleLang === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        className={`googlebot-view__lang${activeChip ? ' is-active' : ''}`}
                        onClick={() => {
                          if (mode === 'languages') toggleLang(lang.id);
                          else setSingleLang(lang.id);
                        }}
                      >
                        {t(langLabelKey(lang.id))}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[var(--os-muted)]">{t('googlebot.langHint')}</p>
              </div>
            ) : null}

            {mode === 'single' ? (
              <div>
                <p className="admin-label">{t('googlebot.ua')}</p>
                <div className="googlebot-view__ua-list mt-2">
                  {FETCH_AS_BOT_PROFILES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`googlebot-view__ua${profile === p.id ? ' is-active' : ''}`}
                      onClick={() => setProfile(p.id)}
                    >
                      <span className="googlebot-view__ua-title">{t(PROFILE_LABEL[p.id])}</span>
                      <span className="googlebot-view__ua-device">
                        {p.device === 'mobile'
                          ? t('googlebot.deviceMobile')
                          : t('googlebot.deviceDesktop')}{' '}
                        · {p.viewportWidth}px
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`googlebot-view__ua${profile === FetchAsBotProfile.Custom ? ' is-active' : ''}`}
                    onClick={() => setProfile(FetchAsBotProfile.Custom)}
                  >
                    <span className="googlebot-view__ua-title">{t('googlebot.profile.custom')}</span>
                    <span className="googlebot-view__ua-device">{t('googlebot.profile.customHint')}</span>
                  </button>
                </div>
                {profile === FetchAsBotProfile.Custom ? (
                  <label className="mt-3 block text-sm">
                    <span className="admin-label">{t('googlebot.customUa')}</span>
                    <textarea
                      className="mt-1.5 w-full min-h-[64px] resize-y border border-[var(--os-line)] bg-[var(--os-panel)] px-2.5 py-2 font-mono text-xs"
                      value={customUa}
                      placeholder="Mozilla/5.0 ..."
                      onChange={(e) => setCustomUa(e.target.value)}
                    />
                  </label>
                ) : (
                  <p className="mt-2 font-mono text-[11px] leading-relaxed text-[var(--os-faint)] break-all">
                    {selectedPresetUa}
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="border border-[var(--os-line-strong)] bg-[var(--os-bad-bg)] px-3 py-2 text-sm text-[var(--os-bad)]">
              {error}
            </div>
          ) : null}

          {views.length === 0 && !error ? (
            <div className="admin-panel flex flex-1 items-center justify-center p-8 text-sm text-[var(--os-muted)]">
              {t('googlebot.empty')}
            </div>
          ) : null}

          {views.length > 0 ? (
            <div
              className={`googlebot-view min-h-0 flex-1 overflow-auto${views.length > 1 ? ' is-compare' : ''}`}
            >
              {views.map((view, index) => (
                <ResultCard
                  key={`${view.profileId}-${view.device}-${view.languageId ?? view.acceptLanguage ?? 'lang'}-${index}`}
                  result={view}
                  t={t}
                  onOpenHreflang={(href) => void runForUrl(href)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
});
