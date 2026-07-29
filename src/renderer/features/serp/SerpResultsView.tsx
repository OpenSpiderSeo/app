/** Shared SERP keyword + site:<domain> results display. */
import { memo } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { SerpReport } from '../../../shared/types/audit.types';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import type { NavSectionName } from '../../app/routes.const';

function shortError(raw: string | undefined): string | null {
  if (!raw) return null;
  let text = raw.replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  if (/ERR_ABORTED|ERR_FAILED|ERR_CONNECTION|net::/i.test(raw)) {
    return 'Запрос оборван (антибот / сеть). Попробуйте позже.';
  }
  if (/captcha|anti-bot|блокирует/i.test(raw)) {
    return 'ПС блокирует запрос (captcha / антибот).';
  }
  if (/timeout|SERP timeout/i.test(raw)) {
    return 'Таймаут загрузки выдачи.';
  }
  if (!text) return 'Не удалось получить выдачу.';
  if (text.length > 120) text = `${text.slice(0, 117)}…`;
  return text;
}

function EngineCard({
  engine,
  badge,
  badgeClass,
  meta,
  error,
  urls,
  emptyNote,
  onNavigate,
}: {
  engine: string;
  badge: string;
  badgeClass: string;
  meta?: string;
  error?: string;
  urls?: string[];
  emptyNote?: string;
  onNavigate?: (section: NavSectionName) => void;
}) {
  const err = shortError(error);
  return (
    <div className="serp-card min-w-0 overflow-hidden border border-[var(--os-line)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 font-mono text-xs uppercase">{engine}</span>
        <span className={`status-pill shrink-0 ${badgeClass}`}>{badge}</span>
      </div>
      {meta ? (
        <div className="mt-1 break-words text-xs text-[var(--os-muted)]">{meta}</div>
      ) : null}
      {err ? (
        <div className="serp-card__err mt-1 text-xs text-[var(--os-muted)]" title={error}>
          {err}
        </div>
      ) : null}
      {urls && urls.length > 0 ? (
        <ul className="mt-2 space-y-1 font-mono text-[11px]">
          {urls.map((u) => (
            <li key={u} className="min-w-0">
              <AnalyzeUrl url={u} compact preferPage onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      ) : emptyNote && !err ? (
        <div className="mt-1 text-xs text-[var(--os-muted)]">{emptyNote}</div>
      ) : null}
      {urls && urls.length === 0 && emptyNote && err ? (
        <div className="mt-1 text-xs text-[var(--os-muted)]">{emptyNote}</div>
      ) : null}
    </div>
  );
}

export const SerpResultsView = memo(function SerpResultsView({
  serp,
  onNavigate,
}: {
  serp: SerpReport;
  onNavigate?: (section: NavSectionName) => void;
}) {
  const { t } = useI18n();
  const keywordEngines = serp.engines.filter(
    (e) => (e.kind ?? (e.query.startsWith('site:') ? 'site' : 'keyword')) === 'keyword',
  );
  const site = serp.siteStats;
  const signalClass =
    site?.indexedSignal === 'strong'
      ? 'status-2xx'
      : site?.indexedSignal === 'weak'
        ? 'status-4xx'
        : 'status-5xx';

  return (
    <div className="serp-results min-w-0 space-y-4 overflow-hidden">
      <div>
        <h3 className="font-display text-base font-semibold">{t('labs.serp.title')}</h3>
        <p className="mt-1 break-words text-sm text-[var(--os-muted)]">
          {t('labs.serp.body', { domain: serp.domain, keyword: serp.keyword })}
        </p>
      </div>

      <div>
        <div className="admin-label mb-2">{t('serp.keywordRanks')}</div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {keywordEngines.map((e) => (
            <EngineCard
              key={`kw-${e.engine}-${e.query}`}
              engine={e.engine}
              badge={
                e.domainRank != null
                  ? `#${e.domainRank}`
                  : e.hits.length === 0
                    ? '0 hits'
                    : 'not in top'
              }
              badgeClass={
                e.domainRank != null && e.domainRank <= 10
                  ? 'status-2xx'
                  : e.domainRank != null
                    ? 'status-4xx'
                    : 'status-5xx'
              }
              meta={`${e.hits.length} hits`}
              error={e.error}
              urls={
                e.domainRank != null && e.hits[e.domainRank - 1]
                  ? [e.hits[e.domainRank - 1]!.url]
                  : e.hits.slice(0, 3).map((h) => h.url)
              }
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
          <span className="admin-label">{t('serp.siteTitle')}</span>
          {site ? (
            <span className={`status-pill max-w-full truncate ${signalClass}`}>
              site:{site.domain} · {site.bestHitCount} {t('serp.pagesApprox')} ·{' '}
              {t(`serp.signal.${site.indexedSignal}`)}
            </span>
          ) : null}
        </div>
        <p className="mb-2 text-xs text-[var(--os-muted)]">{t('serp.siteHint')}</p>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
          {(site?.engines ?? []).map((e) => (
            <EngineCard
              key={`site-${e.engine}`}
              engine={e.engine}
              badge={`${e.hitCount} ${t('serp.results')}`}
              badgeClass={
                e.hitCount >= 8 ? 'status-2xx' : e.hitCount >= 1 ? 'status-4xx' : 'status-5xx'
              }
              error={e.error}
              urls={e.topUrls}
              emptyNote={t('serp.noSiteHits')}
              onNavigate={onNavigate}
            />
          ))}
        </div>
        {site?.archive ? (
          <div className="serp-card mt-3 min-w-0 overflow-hidden border border-[var(--os-line)] px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs uppercase">Wayback</span>
              <span
                className={`status-pill ${
                  site.archive.hitCount >= 1 ? 'status-4xx' : 'status-5xx'
                }`}
              >
                {site.archive.hitCount} {t('serp.results')}
              </span>
            </div>
            <div className="mt-1 break-words text-xs text-[var(--os-muted)]">
              {site.archive.note}
            </div>
            {site.archive.topUrls.length > 0 ? (
              <ul className="mt-2 space-y-1 font-mono text-[11px]">
                {site.archive.topUrls.map((u) => (
                  <li key={u} className="min-w-0">
                    <AnalyzeUrl url={u} compact preferPage={false} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
});
