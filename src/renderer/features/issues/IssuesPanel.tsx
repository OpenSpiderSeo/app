/**
 * Issues workspace — tabs: diagnosis summary · issue list · how to fix.
 */
import { memo, useEffect, useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import type { SeoIssue } from '../../../shared/types/crawl.types';
import { DOMAIN_LABELS, type SeoDomainName } from '../../../shared/const/seo-modules.const';
import { computeFixProgress } from '../../../shared/utils/fix-progress.utils';
import { EmptyStateArt } from '../../assets/brand/EmptyStateArt';
import { ColHeader } from '../../components/ColHeader';
import { PanelTabs } from '../../components/PanelTabs';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import {
  issueFixBetterKey,
  issueFixHowKey,
  issueFixMethodKey,
  issueFixTitleKey,
  issueFixWhyKey,
} from '../../i18n/issue-fix-keys';
import { formatIssueEvidence } from './issue-fix-evidence';
import { useCrawlIssues, useCrawlPages } from '../crawl/use-crawl-queries';
import { ProgressBar } from '../../components/ScoreRing';
import { SeoAuditSummary } from '../seo/SeoAuditSummary';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import { onIssueFilterRequest, openPageInCrawl } from '../../lib/analyze-nav';
import { NavSection, type NavSectionName } from '../../app/routes.const';

type IssuesTabId = 'summary' | 'list' | 'fix';

const DOMAIN_LABELS_RU: Partial<Record<SeoDomainName, string>> = {
  technical: 'Техника',
  on_page: 'On-page',
  content: 'Контент',
  links: 'Ссылки',
  structured_data: 'Микроразметка',
  international: 'International',
  performance: 'Скорость',
  accessibility: 'Доступность',
  search_metrics: 'Поиск',
  behaviour: 'Поведение',
  rankings: 'Позиции',
  off_page: 'Off-page',
  local: 'Локальное',
  competitive: 'Конкуренты',
  reporting: 'Отчёты',
  automation: 'Автоматизация',
  labs_tools: 'Инструменты',
};

function domainDisplayName(domain: string, locale: string): string {
  if (locale === 'ru') {
    return DOMAIN_LABELS_RU[domain as SeoDomainName] ?? DOMAIN_LABELS[domain as SeoDomainName] ?? domain;
  }
  return DOMAIN_LABELS[domain as SeoDomainName] ?? domain;
}

export const IssuesPanel = memo(function IssuesPanel({
  onNavigate,
}: {
  onNavigate?: (section: NavSectionName) => void;
} = {}) {
  const { t, locale } = useI18n();
  const { data: issues = [] } = useCrawlIssues();
  const { data: pages = [] } = useCrawlPages();
  const [tab, setTab] = useState<IssuesTabId>('summary');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'severity', desc: false }]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const openCode = (code: string, nextTab: IssuesTabId = 'fix') => {
    setQuery(code);
    setDomainFilter('all');
    setSeverityFilter('all');
    setPendingCode(code);
    setTab(nextTab);
  };

  useEffect(() => {
    const apply = (code: string) => openCode(code, 'fix');
    try {
      const code = sessionStorage.getItem('openspider:issue-code');
      if (code) {
        sessionStorage.removeItem('openspider:issue-code');
        apply(code);
      }
    } catch {
      /* ignore */
    }
    return onIssueFilterRequest(apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bind once; openCode closes over setters
  }, []);

  useEffect(() => {
    if (!pendingCode) return;
    const needle = pendingCode.trim().toLowerCase();
    const match =
      issues.find((i) => i.code.toLowerCase() === needle) ??
      issues.find((i) => i.code.toLowerCase().includes(needle));
    if (match) {
      setSelectedId(match.id);
      setPendingCode(null);
    } else if (issues.length > 0) {
      setSelectedId(null);
      setPendingCode(null);
    }
  }, [pendingCode, issues]);

  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const issue of issues) {
      if (issue.domain) set.add(issue.domain);
    }
    return ['all', ...[...set].sort()];
  }, [issues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return issues.filter((i) => {
      if (domainFilter !== 'all' && i.domain !== domainFilter) return false;
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false;
      if (!q) return true;
      return (
        i.code.toLowerCase().includes(q) ||
        i.message.toLowerCase().includes(q) ||
        i.url.toLowerCase().includes(q)
      );
    });
  }, [issues, domainFilter, severityFilter, query]);

  const selected = useMemo(
    () =>
      filtered.find((i) => i.id === selectedId) ??
      issues.find((i) => i.id === selectedId) ??
      null,
    [filtered, issues, selectedId],
  );

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const fixProgress = computeFixProgress(issues);

  const columns = useMemo<ColumnDef<SeoIssue>[]>(
    () => [
      {
        accessorKey: 'severity',
        header: () => (
          <ColHeader label={t('issues.col.severity')} hint={t('issues.col.severityHint')} />
        ),
        sortingFn: (a, b) => {
          const order = { error: 0, warning: 1, info: 2 } as const;
          return order[a.original.severity] - order[b.original.severity];
        },
        cell: ({ getValue }) => {
          const severity = getValue<SeoIssue['severity']>();
          const key = `issues.severity.${severity}` as MessageKey;
          return <span className={`status-pill sev-${severity}`}>{t(key)}</span>;
        },
        size: 96,
      },
      {
        accessorKey: 'domain',
        header: () => (
          <ColHeader label={t('issues.col.domain')} hint={t('issues.col.domainHint')} />
        ),
        cell: ({ getValue }) => {
          const domain = getValue<string | undefined>();
          if (!domain) return '—';
          return <span className="truncate">{domainDisplayName(domain, locale)}</span>;
        },
        size: 110,
      },
      {
        accessorKey: 'code',
        header: () => <ColHeader label={t('issues.col.code')} hint={t('issues.col.codeHint')} />,
        cell: ({ getValue }) => (
          <span className="os-table-code block truncate" title={getValue<string>()}>
            {getValue<string>()}
          </span>
        ),
        size: 170,
      },
      {
        accessorKey: 'message',
        header: () => (
          <ColHeader label={t('issues.col.message')} hint={t('issues.col.messageHint')} />
        ),
        cell: ({ getValue }) => {
          const message = getValue<string>();
          return (
            <span className="block truncate text-sm" title={message}>
              {message}
            </span>
          );
        },
        size: 280,
      },
      {
        accessorKey: 'url',
        header: () => <ColHeader label={t('issues.col.url')} hint={t('issues.col.urlHint')} />,
        cell: ({ getValue }) => {
          const url = getValue<string>();
          return (
            <AnalyzeUrl
              url={url}
              compact
              preferPage
              onNavigate={onNavigate}
              onOpenPage={(u) => openPageInCrawl(u, onNavigate)}
            />
          );
        },
        size: 260,
      },
    ],
    [t, locale, onNavigate],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  const domainLabel = (d: string) => {
    if (d === 'all') return t('issues.all', { count: issues.length });
    const count = issues.filter((i) => i.domain === d).length;
    return `${domainDisplayName(d, locale)} (${count})`;
  };

  const tabs = [
    { id: 'summary' as const, label: t('issues.tab.summary') },
    { id: 'list' as const, label: t('issues.tab.list', { count: issues.length }) },
    { id: 'fix' as const, label: t('issues.tab.fix') },
  ];

  return (
    <section className="issues-workspace">
      <header className="issues-workspace__chrome">
        <div className="issues-workspace__intro">
          <p className="admin-label">{t('nav.group.work')}</p>
          <h1 className="font-display mt-1 text-2xl font-semibold leading-tight">{t('issues.title')}</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--os-muted)]">{t('issues.subtitle')}</p>
        </div>
        <div className="issues-workspace__progress">
          <ProgressBar
            value={fixProgress}
            label={t('issues.fixProgress')}
            hint={t('issues.fixProgressHint', {
              errors: String(errors),
              warnings: String(warnings),
            })}
          />
        </div>
      </header>

      <PanelTabs
        ariaLabel={t('issues.tabsLabel')}
        tabs={tabs}
        active={tab}
        onChange={setTab}
        className="issues-workspace__tabs"
      />

      <div className="issues-workspace__body">
        <div
          id="panel-pane-summary"
          role="tabpanel"
          aria-labelledby="panel-tab-summary"
          hidden={tab !== 'summary'}
          className="panel-tabs__pane"
        >
          <SeoAuditSummary
            pages={pages}
            issues={issues}
            onSelectIssueCode={(code) => openCode(code, 'fix')}
          />
        </div>

        <div
          id="panel-pane-list"
          role="tabpanel"
          aria-labelledby="panel-tab-list"
          hidden={tab !== 'list'}
          className="panel-tabs__pane flex flex-col gap-3"
        >
          <div className="crawl-results__toolbar">
            <input
              className="crawl-results__filter"
              placeholder={t('table.filter')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="crawl-results__buckets">
              {(['all', 'error', 'warning', 'info'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverityFilter(s)}
                  className={`crawl-results__bucket sev-${s === 'all' ? 'all' : s}${severityFilter === s ? ' is-active' : ''}`}
                >
                  {s === 'all' ? t('table.allSeverities') : t(`issues.severity.${s}` as MessageKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="os-filter-chip-row">
            {domains.map((d) => {
              const active = domainFilter === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDomainFilter(d);
                    setSelectedId(null);
                  }}
                  className={`os-filter-chip${active ? ' is-active' : ''}`}
                >
                  {domainLabel(d)}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="admin-panel os-empty-state min-h-[16rem] border-dashed p-8">
              <EmptyStateArt kind="error" size={100} className="os-empty-state__art" />
              <p className="os-empty-state__text">{t('issues.empty')}</p>
              <p className="os-empty-state__hint mt-2 text-sm text-[var(--os-muted)]">
                {t('issues.emptyNext')}
              </p>
              {onNavigate ? (
                <button
                  type="button"
                  className="os-btn os-btn--primary mt-4"
                  onClick={() => onNavigate(NavSection.Crawl)}
                >
                  {t('overview.step1.cta')}
                </button>
              ) : null}
            </div>
          ) : (
            <div className="issues-workspace__table">
              <div className="admin-panel min-h-0 overflow-auto">
                <table className="os-table w-full min-w-[860px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-[var(--os-panel-2)] text-[11px] uppercase tracking-wide text-[var(--os-faint)]">
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id}>
                        {hg.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-[var(--os-line)] px-3 py-2 font-medium"
                            style={{ width: header.getSize() }}
                          >
                            <button
                              type="button"
                              className="hover:text-[var(--os-ink)]"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: ' ↑',
                                desc: ' ↓',
                              }[header.column.getIsSorted() as string] ?? ''}
                            </button>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => {
                      const active = row.id === selectedId;
                      return (
                        <tr
                          key={row.id}
                          data-testid={`issue-row-${row.id}`}
                          onClick={() => {
                            setSelectedId(row.id);
                            setTab('fix');
                          }}
                          className={`cursor-pointer border-b border-[var(--os-line)] ${
                            active
                              ? 'bg-[var(--os-selected)] text-[var(--os-selected-fg)]'
                              : 'hover:bg-[var(--os-hover)]'
                          }`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="max-w-0 overflow-hidden px-3 py-2 align-middle"
                              style={{ width: cell.column.getSize() }}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div
          id="panel-pane-fix"
          role="tabpanel"
          aria-labelledby="panel-tab-fix"
          hidden={tab !== 'fix'}
          className="panel-tabs__pane"
        >
          <article className="admin-panel issues-fix-pane p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-display text-base font-semibold">{t('issues.fix.title')}</h2>
              {selected ? (
                <button
                  type="button"
                  className="os-btn os-btn--ghost text-xs"
                  onClick={() => setTab('list')}
                >
                  {t('issues.fix.backToList')}
                </button>
              ) : null}
            </div>

            {!selected ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[var(--os-muted)]">{t('issues.fix.pick')}</p>
                <button
                  type="button"
                  className="os-btn os-btn--secondary"
                  onClick={() => setTab('list')}
                >
                  {t('issues.fix.openList')}
                </button>
              </div>
            ) : (
              <div className="mt-4 flex max-w-3xl flex-col gap-5 text-sm">
                <div>
                  <div className="font-mono text-[11px] text-[var(--os-faint)]">{selected.code}</div>
                  <h3 className="font-display mt-1 text-lg font-semibold">
                    {t(issueFixTitleKey(selected.code))}
                  </h3>
                  <div className="mt-2">
                    <AnalyzeUrl url={selected.url} preferPage onNavigate={onNavigate} />
                  </div>
                </div>

                {selected.evidence ? (
                  <div>
                    <div className="admin-label">{t('issues.fix.found')}</div>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-[var(--os-ink)]">
                      {formatIssueEvidence(selected.evidence, locale)}
                    </p>
                  </div>
                ) : null}

                {issueFixMethodKey(selected.code) ? (
                  <div>
                    <div className="admin-label">{t('issues.fix.method')}</div>
                    <p className="mt-1 leading-relaxed text-[var(--os-muted)]">
                      {t(issueFixMethodKey(selected.code)!)}
                    </p>
                  </div>
                ) : null}

                <div>
                  <div className="admin-label">{t('issues.fix.why')}</div>
                  <p className="mt-1 leading-relaxed text-[var(--os-muted)]">
                    {t(issueFixWhyKey(selected.code))}
                  </p>
                </div>

                {issueFixBetterKey(selected.code) ? (
                  <div>
                    <div className="admin-label">{t('issues.fix.better')}</div>
                    <pre className="mt-1 overflow-x-auto border border-[var(--os-line)] bg-[var(--os-panel-2)] p-3 font-mono text-[11px] leading-relaxed text-[var(--os-ink)]">
                      {t(issueFixBetterKey(selected.code)!)}
                    </pre>
                  </div>
                ) : null}

                <div>
                  <div className="admin-label">{t('issues.fix.how')}</div>
                  <p className="mt-1 whitespace-pre-line leading-relaxed">
                    {t(issueFixHowKey(selected.code))}
                  </p>
                </div>
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
});
