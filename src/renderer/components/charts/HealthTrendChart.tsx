import { memo, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryListItem } from '../../../shared/types/report.types';
import { useI18n } from '../../i18n/I18nProvider';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import { healthTrendFromHistory } from './chart-data.utils';
import {
  CHART,
  chartMargin,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from './chart-theme';

export const HealthTrendChart = memo(function HealthTrendChart({
  history,
}: {
  history: HistoryListItem[];
}) {
  const { t } = useI18n();
  const data = useMemo(() => healthTrendFromHistory(history), [history]);

  return (
    <ChartCard title={t('charts.healthTrend.title')} hint={t('charts.healthTrend.hint')}>
      {data.length < 2 ? (
        <ChartEmpty message={t('charts.healthTrend.empty')} />
      ) : (
        <div className="os-chart-line-plot">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ ...chartMargin, left: 4 }}>
            <defs>
              <linearGradient id="healthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: CHART.axis, fontSize: 11 }}
              axisLine={{ stroke: CHART.grid }}
              tickLine={false}
            />
            <YAxis
              yAxisId="health"
              domain={[0, 100]}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="errors"
              orientation="right"
              allowDecimals={false}
              tick={{ fill: CHART.bad, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={chartTooltipStyle}
              itemStyle={chartTooltipItemStyle}
              labelStyle={chartTooltipLabelStyle}
              formatter={(value, name) => {
                const n = typeof value === 'number' ? value : Number(value ?? 0);
                if (name === 'health') return [n, t('charts.healthTrend.health')];
                return [n, t('charts.healthTrend.errors')];
              }}
            />
            <Area
              type="monotone"
              dataKey="health"
              stroke={CHART.accent}
              strokeWidth={2}
              fill="url(#healthGrad)"
              yAxisId="health"
            />
            <Line
              type="monotone"
              dataKey="errors"
              stroke={CHART.bad}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              yAxisId="errors"
            />
          </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
});
