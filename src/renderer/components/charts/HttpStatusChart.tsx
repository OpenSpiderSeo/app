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
import type { CrawledPage } from '../../../shared/types/crawl.types';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import { httpStatusBuckets, httpStatusBucketsFromLocal } from './chart-data.utils';
import {
  CHART,
  CHART_BAR_HEIGHT,
  HTTP_STATUS_COLORS,
  barChartMargin,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from './chart-theme';

export const HttpStatusChart = memo(function HttpStatusChart({
  pages,
  fallbackBuckets,
}: {
  pages: CrawledPage[];
  /** From GET /api/metrics/local when pages cache is stale or empty. */
  fallbackBuckets?: { label: string; count: number }[];
}) {
  const { t } = useI18n();
  const data = useMemo(() => {
    const raw =
      pages.length > 0
        ? httpStatusBuckets(pages)
        : fallbackBuckets?.length
          ? httpStatusBucketsFromLocal(fallbackBuckets)
          : httpStatusBuckets(pages);
    return raw.map((d) => ({
      ...d,
      fill: HTTP_STATUS_COLORS[d.name] ?? CHART.muted,
      label: t(`charts.http.${d.name}` as MessageKey),
    }));
  }, [pages, fallbackBuckets, t]);

  const total = data.reduce((n, d) => n + d.value, 0);

  return (
    <ChartCard title={t('charts.http.title')} hint={t('charts.http.hint')}>
      {total === 0 ? (
        <ChartEmpty message={t('charts.noPages')} />
      ) : (
        <div className="os-chart-bar-plot">
          <ResponsiveContainer width="100%" height={CHART_BAR_HEIGHT}>
            <BarChart data={data} margin={barChartMargin}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={{ stroke: CHART.grid }}
                tickLine={false}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: CHART.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                itemStyle={chartTooltipItemStyle}
                labelStyle={chartTooltipLabelStyle}
                formatter={(value) => [
                  typeof value === 'number' ? value : Number(value ?? 0),
                  t('charts.http.pages'),
                ]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
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
