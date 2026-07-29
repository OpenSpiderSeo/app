import { memo, useMemo } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { SeoIssue } from '../../../shared/types/crawl.types';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/translate';
import { ChartCard } from './ChartCard';
import { ChartEmpty } from './ChartEmpty';
import { ChartLegend } from './ChartLegend';
import { DonutChartLayout } from './DonutChartLayout';
import { issuesBySeverity } from './chart-data.utils';
import {
  CHART,
  SEVERITY_COLORS,
  chartTooltipItemStyle,
  chartTooltipLabelStyle,
  chartTooltipStyle,
} from './chart-theme';

export const IssuesSeverityChart = memo(function IssuesSeverityChart({
  issues,
}: {
  issues: SeoIssue[];
}) {
  const { t } = useI18n();
  const data = useMemo(() => issuesBySeverity(issues), [issues]);

  const labeled = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        fill: SEVERITY_COLORS[d.name as keyof typeof SEVERITY_COLORS] ?? CHART.muted,
        label: t(`issues.severity.${d.name}` as MessageKey),
      })),
    [data, t],
  );

  const total = labeled.reduce((n, d) => n + d.value, 0);

  const legendItems = useMemo(
    () =>
      labeled.map((d) => ({
        key: d.name,
        label: d.label,
        value: d.value,
        color: d.fill,
      })),
    [labeled],
  );

  return (
    <ChartCard title={t('charts.issuesSeverity.title')} hint={t('charts.issuesSeverity.hint')}>
      {total === 0 ? (
        <ChartEmpty message={t('charts.noIssues')} />
      ) : (
        <DonutChartLayout
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={labeled}
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
                  {labeled.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={chartTooltipItemStyle}
                  labelStyle={chartTooltipLabelStyle}
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
