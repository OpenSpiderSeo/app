import { memo, useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RankCheck } from '../../../shared/types/audit.types';
import { useI18n } from '../../i18n/I18nProvider';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import { rankHistoryByKeyword } from './chart-data.utils';
import {
  CHART,
  chartMargin,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from './chart-theme';

const LINE_COLORS = [CHART.accent, '#60a5fa', CHART.ok, CHART.warn, '#a78bfa'];

export const RankHistoryChart = memo(function RankHistoryChart({
  ranks,
}: {
  ranks: RankCheck[];
}) {
  const { t } = useI18n();
  const series = useMemo(() => rankHistoryByKeyword(ranks), [ranks]);

  const chartData = useMemo(() => {
    if (series.length === 0) return [];
    const labels = new Set<string>();
    for (const s of series) {
      for (const p of s.points) labels.add(p.label);
    }
    const ordered = [...labels];
    return ordered.map((label) => {
      const row: Record<string, string | number | null> = { label };
      for (const s of series) {
        const pt = s.points.find((p) => p.label === label);
        row[s.keyword] = pt?.rank ?? null;
      }
      return row;
    });
  }, [series]);

  const hasData = chartData.some((row) =>
    series.some((s) => row[s.keyword] != null),
  );

  return (
    <ChartCard title={t('charts.rank.title')} hint={t('charts.rank.hint')}>
      {!hasData ? (
        <ChartEmpty message={t('charts.rank.empty')} />
      ) : (
        <div className="os-chart-line-plot">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ ...chartMargin, left: 4, right: 12 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART.axis, fontSize: 11 }}
              axisLine={{ stroke: CHART.grid }}
              tickLine={false}
            />
            <YAxis
              reversed
              domain={[1, 'auto']}
              allowDecimals={false}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: t('charts.rank.axis'),
                angle: -90,
                position: 'insideLeft',
                fill: CHART.muted,
                fontSize: 10,
              }}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={chartTooltipItemStyle}
              labelStyle={chartTooltipLabelStyle}
              formatter={(value, name) => {
                const rank = typeof value === 'number' ? value : null;
                return [rank != null ? `#${rank}` : '—', String(name ?? '')];
              }}
            />
            {series.map((s, i) => (
              <Line
                key={s.keyword}
                type="monotone"
                dataKey={s.keyword}
                name={s.keyword}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: LINE_COLORS[i % LINE_COLORS.length] }}
                connectNulls
              />
            ))}
          </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});
