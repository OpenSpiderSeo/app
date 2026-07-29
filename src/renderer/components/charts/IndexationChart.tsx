import { memo, useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { CrawledPage } from '../../../shared/types/crawl.types';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import { ChartLegend } from './ChartLegend';
import { DonutChartLayout } from './DonutChartLayout';
import { indexationSplit } from './chart-data.utils';
import { CHART, chartTooltipStyle } from './chart-theme';

const INDEXATION_COLORS: Record<string, string> = {
  indexable: CHART.ok,
  noindex: CHART.warn,
  nonOk: CHART.bad,
};

export const IndexationChart = memo(function IndexationChart({
  pages,
}: {
  pages: CrawledPage[];
}) {
  const { t } = useI18n();
  const data = useMemo(() => {
    return indexationSplit(pages).map((d) => ({
      ...d,
      fill: INDEXATION_COLORS[d.name] ?? CHART.muted,
      label: t(`charts.indexation.${d.name}` as MessageKey),
    }));
  }, [pages, t]);

  const total = data.reduce((n, d) => n + d.value, 0);

  const legendItems = useMemo(
    () =>
      data.map((d) => ({
        key: d.name,
        label: d.label,
        value: d.value,
        color: d.fill,
      })),
    [data],
  );

  return (
    <ChartCard title={t('charts.indexation.title')} hint={t('charts.indexation.hint')}>
      {total === 0 ? (
        <ChartEmpty message={t('charts.noPages')} />
      ) : (
        <DonutChartLayout
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="transparent"
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value, _name, item) => [
                    typeof value === 'number' ? value : Number(value ?? 0),
                    (item?.payload as { label?: string } | undefined)?.label ?? '',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          }
          legend={<ChartLegend items={legendItems} />}
        />
      )}
    </ChartCard>
  );
});
