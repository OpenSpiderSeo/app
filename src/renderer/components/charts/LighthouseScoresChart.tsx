import { memo, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LighthouseScores } from '../../../shared/types/audit.types';
import { useI18n } from '../../i18n/I18nProvider';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import {
  CHART,
  CHART_BAR_HEIGHT,
  barChartMargin,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from './chart-theme';

function scoreColor(score: number): string {
  if (score >= 90) return CHART.ok;
  if (score >= 50) return CHART.warn;
  return CHART.bad;
}

export const LighthouseScoresChart = memo(function LighthouseScoresChart({
  scores,
}: {
  scores: LighthouseScores;
}) {
  const { t } = useI18n();
  const data = useMemo(() => {
    const items = [
      { key: 'performance', value: scores.performance },
      { key: 'seo', value: scores.seo },
      { key: 'accessibility', value: scores.accessibility },
      { key: 'bestPractices', value: scores.bestPractices },
    ] as const;
    return items
      .filter((i) => i.value != null)
      .map((i) => ({
        name: i.key,
        value: i.value!,
        label: t(`charts.lighthouse.${i.key}` as 'charts.lighthouse.performance'),
        fill: scoreColor(i.value!),
      }));
  }, [scores, t]);

  return (
    <ChartCard title={t('charts.lighthouse.title')} hint={t('charts.lighthouse.hint')}>
      {data.length === 0 ? (
        <ChartEmpty message={t('charts.lighthouse.empty')} />
      ) : (
      <div className="os-chart-bar-plot">
        <ResponsiveContainer width="100%" height={CHART_BAR_HEIGHT}>
          <BarChart data={data} margin={barChartMargin} layout="vertical">
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            axisLine={{ stroke: CHART.grid }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={88}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            itemStyle={chartTooltipItemStyle}
            labelStyle={chartTooltipLabelStyle}
            formatter={(value) => [
              typeof value === 'number' ? value : Number(value ?? 0),
              t('charts.lighthouse.score'),
            ]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </ChartCard>
  );
});
