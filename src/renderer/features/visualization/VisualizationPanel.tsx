import { memo, useEffect, useMemo, useState } from 'react';
import { Button } from '@heroui/react';
import { EmptyStateArt } from '../../assets/brand/EmptyStateArt';
import { useI18n } from '../../i18n/I18nProvider';
import { useProject } from '../projects/ProjectProvider';
import { openPageInCrawl } from '../../lib/analyze-nav';
import { AnalyzeUrl } from '../../components/AnalyzeUrl';

interface GraphData {
  nodes: { id: string; label: string; depth: number }[];
  edges: { source: string; target: string }[];
}

const PAD = 48;
const COL_W = 88;
const ROW_H = 52;
const DEPTH_GAP = 36;
const MAX_COLS = 10;
const LABEL_LIMIT = 24;

function shortLabel(label: string, max = 18): string {
  const clean = label.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

export const VisualizationPanel = memo(function VisualizationPanel({
  onNavigate,
}: {
  onNavigate?: (section: import('../../app/routes.const').NavSectionName) => void;
} = {}) {
  const { t } = useI18n();
  const { active } = useProject();
  const [graph, setGraph] = useState<GraphData>({ nodes: [], edges: [] });
  const [busy, setBusy] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const load = async () => {
    setBusy(true);
    try {
      const data = await window.openspider.getLinkGraph();
      setGraph(data);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setGraph({ nodes: [], edges: [] });
    setHoverId(null);
    void load();
  }, [active?.id]);

  const degree = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of graph.nodes) map.set(n.id, 0);
    for (const e of graph.edges) {
      map.set(e.source, (map.get(e.source) ?? 0) + 1);
      map.set(e.target, (map.get(e.target) ?? 0) + 1);
    }
    return map;
  }, [graph]);

  const layout = useMemo(() => {
    const byDepth = new Map<number, typeof graph.nodes>();
    for (const n of graph.nodes) {
      const list = byDepth.get(n.depth) ?? [];
      list.push(n);
      byDepth.set(n.depth, list);
    }

    const depths = [...byDepth.keys()].sort((a, b) => a - b);
    const pos = new Map<string, { x: number; y: number }>();

    let maxRowWidth = 1;
    let yCursor = PAD;

    for (const depth of depths) {
      const row = [...(byDepth.get(depth) ?? [])].sort(
        (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0),
      );
      const cols = Math.min(MAX_COLS, Math.max(1, row.length));
      const bands = Math.ceil(row.length / cols);
      maxRowWidth = Math.max(maxRowWidth, cols);

      for (let i = 0; i < row.length; i += 1) {
        const col = i % cols;
        const band = Math.floor(i / cols);
        const bandCount = Math.min(cols, row.length - band * cols);
        const bandWidth = bandCount * COL_W;
        const offsetX = (cols * COL_W - bandWidth) / 2;
        const x = PAD + offsetX + col * COL_W + COL_W / 2;
        const y = yCursor + band * ROW_H + ROW_H / 2;
        pos.set(row[i].id, { x, y });
      }

      yCursor += bands * ROW_H + DEPTH_GAP;
    }

    const w = PAD * 2 + maxRowWidth * COL_W;
    const h = Math.max(320, yCursor + PAD);
    return { w, h, pos };
  }, [graph, degree]);

  const showAllLabels = graph.nodes.length <= LABEL_LIMIT;
  const hoverNode = hoverId ? graph.nodes.find((n) => n.id === hoverId) : null;
  const neighbors = useMemo(() => {
    if (!hoverId) return new Set<string>();
    const set = new Set<string>([hoverId]);
    for (const e of graph.edges) {
      if (e.source === hoverId) set.add(e.target);
      if (e.target === hoverId) set.add(e.source);
    }
    return set;
  }, [graph.edges, hoverId]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-4">
      <header className="hub-panel__toolbar">
        <p className="hub-panel__lead max-w-2xl">{t('viz.subtitle')}</p>
        <Button variant="secondary" isDisabled={busy} onPress={() => void load()}>
          {t('viz.refresh')}
        </Button>
      </header>
      <p className="text-xs text-[var(--os-faint)]">{t('viz.clickHint')}</p>

      {graph.nodes.length === 0 ? (
        <div className="admin-panel os-empty-state flex-1 p-8">
          <EmptyStateArt kind="web" size={140} className="os-empty-state__art" />
          <p className="os-empty-state__text">{t('viz.empty')}</p>
        </div>
      ) : (
        <div className="admin-panel flex min-h-0 flex-1 flex-col overflow-hidden p-3">
          <div className="min-h-0 flex-1 overflow-auto">
            <svg
              width={layout.w}
              height={layout.h}
              className="block"
              onMouseLeave={() => setHoverId(null)}
            >
              {graph.edges.map((e, i) => {
                const a = layout.pos.get(e.source);
                const b = layout.pos.get(e.target);
                if (!a || !b) return null;
                const activeEdge =
                  !hoverId || e.source === hoverId || e.target === hoverId;
                return (
                  <line
                    key={`${e.source}-${e.target}-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={activeEdge ? '#9a8a92' : '#e8e0e4'}
                    strokeWidth={activeEdge && hoverId ? 1.5 : 1}
                    opacity={activeEdge ? 1 : 0.35}
                  />
                );
              })}
              {graph.nodes.map((n) => {
                const p = layout.pos.get(n.id);
                if (!p) return null;
                const deg = degree.get(n.id) ?? 0;
                const r = Math.min(14, 5 + Math.sqrt(deg));
                const isHot = !hoverId || neighbors.has(n.id);
                const isFocus = hoverId === n.id;
                const showLabel =
                  showAllLabels || isFocus || (isHot && hoverId !== null && deg >= 3);
                return (
                  <g
                    key={n.id}
                    onMouseEnter={() => setHoverId(n.id)}
                    onClick={() => openPageInCrawl(n.id, onNavigate)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill={isFocus ? '#c45c7a' : isHot ? '#1a1a1a' : '#cfc6cb'}
                    />
                    <title>{`${n.label}\n${n.id}`}</title>
                    {showLabel ? (
                      <text
                        x={p.x}
                        y={p.y + r + 12}
                        textAnchor="middle"
                        fontSize={10}
                        fill={isFocus ? '#1a1a1a' : '#555'}
                        style={{ pointerEvents: 'none' }}
                      >
                        {shortLabel(n.label)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--os-line)] pt-2 font-mono text-xs text-[var(--os-faint)]">
            <span>
              {graph.nodes.length} {t('viz.nodes')} · {graph.edges.length} {t('viz.edges')}
            </span>
            <span className="max-w-[70%] text-right text-[var(--os-muted)]">
              {hoverNode ? (
                <AnalyzeUrl url={hoverNode.id} compact preferPage onNavigate={onNavigate} />
              ) : (
                t('viz.hoverHint')
              )}
            </span>
          </div>
        </div>
      )}
    </section>
  );
});
