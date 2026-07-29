/**
 * Crawl URL table — SEO columns + page detail drawer.
 */
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { EmptyStateArt } from '../../assets/brand/EmptyStateArt';
import { ColHeader } from '../../components/ColHeader';
import type { CrawledPage } from '../../../shared/types/crawl.types';
import { pageH1, pageHreflang, pageMetaDescription, pageTitle } from '../../../shared/utils/crawl-state.utils';
import { pageIndexLabel } from '../../../shared/utils/seo-audit.utils';
import { useI18n } from '../../i18n/I18nProvider';
import { PageSeoDrawer } from '../seo/PageSeoDrawer';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';
import {
  consumePendingCrawlFilter,
  consumePendingPageUrl,
  onCrawlFilterRequest,
  onPageDetailRequest,
} from '../../lib/analyze-nav';
import type { NavSectionName } from '../../app/routes.const';
import { useCrawlIssues, useCrawlPages } from './use-crawl-queries';

const ROW_HEIGHT = 36;
const STICKY_COLUMN_IDS = new Set(['status', 'index', 'url']);
const STICKY_COLUMN_ORDER = ['status', 'index', 'url'] as const;

function stickyLeftStyle(columnId: string, sizes: Record<string, number>): CSSProperties | undefined {
  if (!STICKY_COLUMN_IDS.has(columnId)) return undefined;
  let left = 0;
  for (const id of STICKY_COLUMN_ORDER) {
    if (id === columnId) break;
    left += sizes[id] ?? 0;
  }
  return { left };
}

function statusClass(code: number, error: string | null): string {
  if (error) return 'status-err';
  if (code >= 500) return 'status-5xx';
  if (code >= 400) return 'status-4xx';
  if (code >= 300) return 'status-3xx';
  if (code >= 200) return 'status-2xx';
  return 'status-err';
}

function StatusCell({ code, error }: { code: number; error: string | null }) {
  const label = error ? 'ERR' : String(code || '—');
  return <span className={`status-pill ${statusClass(code, error)}`}>{label}</span>;
}

function shortUrl(url: string | null): string {
  if (!url) return '—';
  try {
    const u = new URL(url);
    const path = `${u.pathname}${u.search}`;
    return path.length > 36 ? `${path.slice(0, 35)}…` : path || '/';
  } catch {
    return url.slice(0, 36);
  }
}

export const CrawlResultsTable = memo(function CrawlResultsTable({
  onViewAsGoogle,
  onNavigate,
}: {
  onViewAsGoogle?: (url: string) => void;
  onNavigate?: (section: NavSectionName) => void;
}) {
  const { t } = useI18n();
  const { data: pages = [] } = useCrawlPages();
  const { data: issues = [] } = useCrawlIssues();
  const parentRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'status', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusBucket, setStatusBucket] = useState<'all' | '2xx' | '3xx' | '4xx' | '5xx' | 'err'>(
    'all',
  );
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    const pending = consumePendingPageUrl();
    if (pending) setSelectedUrl(pending);
    const pendingFilter = consumePendingCrawlFilter();
    if (pendingFilter) setGlobalFilter(pendingFilter);
    const offPage = onPageDetailRequest((url) => setSelectedUrl(url));
    const offFilter = onCrawlFilterRequest((q) => setGlobalFilter(q));
    return () => {
      offPage();
      offFilter();
    };
  }, []);

  const filteredPages = useMemo(() => {
    return pages.filter((p) => {
      if (statusBucket === 'all') return true;
      if (statusBucket === 'err') return Boolean(p.error);
      if (statusBucket === '2xx') return p.statusCode >= 200 && p.statusCode < 300;
      if (statusBucket === '3xx') return p.statusCode >= 300 && p.statusCode < 400;
      if (statusBucket === '4xx') return p.statusCode >= 400 && p.statusCode < 500;
      if (statusBucket === '5xx') return p.statusCode >= 500;
      return true;
    });
  }, [pages, statusBucket]);

  const selectedPage = useMemo(
    () => pages.find((p) => p.url === selectedUrl) ?? null,
    [pages, selectedUrl],
  );

  const columns = useMemo<ColumnDef<CrawledPage>[]>(
    () => [
      {
        id: 'status',
        header: () => (
          <ColHeader label={t('crawl.col.status')} hint={t('crawl.col.statusHint')} />
        ),
        accessorFn: (row) => row.statusCode,
        cell: ({ row }) => (
          <StatusCell code={row.original.statusCode} error={row.original.error} />
        ),
        size: 64,
      },
      {
        id: 'index',
        header: () => (
          <ColHeader label={t('crawl.col.index')} hint={t('crawl.col.indexHint')} />
        ),
        accessorFn: (row) => pageIndexLabel(row),
        cell: ({ getValue }) => {
          const v = getValue<'index' | 'noindex' | 'blocked'>();
          return <span className={`index-pill is-${v}`}>{t(`pageSeo.index.${v}`)}</span>;
        },
        size: 80,
      },
      {
        accessorKey: 'url',
        header: () => <ColHeader label={t('crawl.col.url')} hint={t('crawl.col.urlHint')} />,
        cell: ({ getValue }) => {
          const url = getValue<string>();
          return (
            <AnalyzeUrl
              url={url}
              compact
              onOpenPage={(u) => setSelectedUrl(u)}
              onNavigate={onNavigate}
            />
          );
        },
        size: 240,
      },
      {
        accessorKey: 'title',
        header: () => (
          <ColHeader label={t('crawl.col.title')} hint={t('crawl.col.titleHint')} />
        ),
        cell: ({ getValue, row }) => {
          const title = getValue<string | null>() ?? '—';
          const len = pageTitle(row.original).length;
          return (
            <span className="block max-w-[180px] truncate" title={`${title} (${len})`}>
              {title}
              {len ? <span className="ml-1 text-[10px] text-[var(--os-faint)]">{len}</span> : null}
            </span>
          );
        },
        size: 180,
      },
      {
        id: 'descLen',
        header: () => <ColHeader label={t('crawl.col.desc')} hint={t('crawl.col.descHint')} />,
        accessorFn: (row) => pageMetaDescription(row).length,
        cell: ({ getValue, row }) => {
          const len = getValue<number>();
          const desc = pageMetaDescription(row.original);
          return (
            <span className="os-table-num text-xs tabular-nums" title={desc}>
              {len || '—'}
            </span>
          );
        },
        size: 56,
      },
      {
        id: 'canonical',
        header: () => (
          <ColHeader label={t('crawl.col.canonical')} hint={t('crawl.col.canonicalHint')} />
        ),
        accessorFn: (row) => row.canonical ?? '',
        cell: ({ getValue }) => {
          const c = getValue<string>();
          return (
            <span className="os-table-url block max-w-[120px] truncate" title={c || undefined}>
              {shortUrl(c || null)}
            </span>
          );
        },
        size: 120,
      },
      {
        id: 'lang',
        header: () => <ColHeader label={t('crawl.col.lang')} hint={t('crawl.col.langHint')} />,
        accessorFn: (row) => row.htmlLang || row.language || '',
        cell: ({ getValue }) => (
          <span className="os-table-code text-xs">{getValue<string>() || '—'}</span>
        ),
        size: 64,
      },
      {
        id: 'hreflang',
        header: () => (
          <ColHeader label={t('crawl.col.hreflang')} hint={t('crawl.col.hreflangHint')} />
        ),
        accessorFn: (row) => pageHreflang(row).length,
        cell: ({ getValue }) => getValue<number>() || '—',
        size: 56,
      },
      {
        id: 'h1',
        header: () => <ColHeader label={t('crawl.col.h1')} hint={t('crawl.col.h1Hint')} />,
        accessorFn: (row) => pageH1(row)[0] ?? '—',
        cell: ({ getValue, row }) => (
          <span className="block max-w-[120px] truncate" title={pageH1(row.original).join(' | ')}>
            {getValue<string>()}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'wordCount',
        header: () => (
          <ColHeader label={t('crawl.col.words')} hint={t('crawl.col.wordsHint')} />
        ),
        cell: ({ getValue }) => getValue<number>() || '—',
        size: 64,
      },
      {
        accessorKey: 'depth',
        header: () => (
          <ColHeader label={t('crawl.col.depth')} hint={t('crawl.col.depthHint')} />
        ),
        size: 56,
      },
      {
        accessorKey: 'inlinks',
        header: () => <ColHeader label={t('crawl.col.in')} hint={t('crawl.col.inHint')} />,
        size: 48,
      },
      {
        accessorKey: 'outlinks',
        header: () => <ColHeader label={t('crawl.col.out')} hint={t('crawl.col.outHint')} />,
        size: 48,
      },
      ...(onViewAsGoogle
        ? ([
            {
              id: 'googlebot',
              header: () => (
                <ColHeader
                  label={t('crawl.col.googlebot')}
                  hint={t('crawl.col.googlebotHint')}
                />
              ),
              enableSorting: false,
              cell: ({ row }) => (
                <button
                  type="button"
                  className="crawl-googlebot-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAsGoogle(row.original.url);
                  }}
                >
                  {t('crawl.viewGooglebot')}
                </button>
              ),
              size: 100,
            },
          ] as ColumnDef<CrawledPage>[])
        : []),
    ],
    [t, onViewAsGoogle, onNavigate],
  );

  const table = useReactTable({
    data: filteredPages,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _id, filter) => {
      const q = String(filter).toLowerCase();
      if (!q) return true;
      const p = row.original;
      return (
        p.url.toLowerCase().includes(q) ||
        pageTitle(p).toLowerCase().includes(q) ||
        pageMetaDescription(p).toLowerCase().includes(q) ||
        (p.canonical ?? '').toLowerCase().includes(q) ||
        pageH1(p).some((h) => h.toLowerCase().includes(q))
      );
    },
    getRowId: (row) => row.url,
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const stickySizes = useMemo(
    () =>
      Object.fromEntries(
        columns.map((c) => [
          c.id ?? String((c as { accessorKey?: string }).accessorKey),
          c.size ?? 0,
        ]),
      ),
    [columns],
  );

  if (pages.length === 0) {
    return (
      <div className="admin-panel os-empty-state border-dashed px-6 py-16">
        <EmptyStateArt kind="blade" size={140} className="os-empty-state__art" />
        <p className="os-empty-state__text">{t('crawl.empty')}</p>
        <p className="os-empty-state__hint mt-2 text-sm text-[var(--os-muted)]">
          {t('crawl.emptyNext')}
        </p>
      </div>
    );
  }

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className={`crawl-results${selectedPage ? ' has-drawer' : ''}`}>
      <div className="crawl-results__main">
        <div className="crawl-results__toolbar">
          <input
            className="crawl-results__filter"
            placeholder={t('table.filter')}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          <div className="crawl-results__buckets">
            {(['all', '2xx', '3xx', '4xx', '5xx', 'err'] as const).map((b) => (
              <button
                key={b}
                type="button"
                className={`crawl-results__bucket${statusBucket === b ? ' is-active' : ''}`}
                onClick={() => setStatusBucket(b)}
                title={t(`charts.http.${b === 'all' ? 'pages' : b === 'err' ? 'other' : b}` as import('../../i18n/translate').MessageKey)}
              >
                {t(`crawl.bucket.${b}` as import('../../i18n/translate').MessageKey)}
              </button>
            ))}
          </div>
        </div>

        <div ref={parentRef} className="admin-panel crawl-results__grid">
          <div className="crawl-results__table min-w-[1180px]">
            <div className="crawl-results__header sticky top-0 z-20 flex bg-[var(--os-panel-2)] text-[11px] uppercase tracking-wide text-[var(--os-faint)]">
              {table.getHeaderGroups().map((hg) =>
                hg.headers.map((header) => {
                  const sticky = STICKY_COLUMN_IDS.has(header.column.id);
                  return (
                  <button
                    key={header.id}
                    type="button"
                    className={`crawl-results__th shrink-0 border-b border-[var(--os-line)] px-2.5 py-2 text-left font-medium hover:bg-[var(--os-hover)]${sticky ? ' crawl-results__cell--sticky' : ''}`}
                    style={{ width: header.getSize(), ...stickyLeftStyle(header.column.id, stickySizes) }}
                    onClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ''}
                  </button>
                );
                }),
              )}
            </div>

            <div className="relative w-full" style={{ height: totalSize }}>
              {virtualRows.map((vRow) => {
                const row = rows[vRow.index];
                const active = row.original.url === selectedUrl;
                return (
                  <div
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className={`crawl-results__row absolute left-0 flex w-full cursor-pointer border-t border-[var(--os-line)] text-sm ${
                      active ? 'is-active' : ''
                    }`}
                    style={{
                      height: vRow.size,
                      transform: `translateY(${vRow.start}px)`,
                    }}
                    onClick={() => setSelectedUrl(row.original.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedUrl(row.original.url);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const sticky = STICKY_COLUMN_IDS.has(cell.column.id);
                      return (
                      <div
                        key={cell.id}
                        className={`os-table-cell crawl-results__cell flex shrink-0 items-center overflow-hidden px-2.5${sticky ? ' crawl-results__cell--sticky' : ''}${active && sticky ? ' is-active' : ''}`}
                        style={{ width: cell.column.getSize(), ...stickyLeftStyle(cell.column.id, stickySizes) }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {selectedPage ? (
        <PageSeoDrawer
          page={selectedPage}
          issues={issues}
          onClose={() => setSelectedUrl(null)}
          onViewAsGoogle={onViewAsGoogle}
          onNavigate={onNavigate}
        />
      ) : null}
    </div>
  );
});
