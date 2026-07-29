import { memo, type ReactNode } from 'react';

export const DonutChartLayout = memo(function DonutChartLayout({
  chart,
  legend,
}: {
  chart: ReactNode;
  legend: ReactNode;
}) {
  return (
    <div className="os-chart-donut-layout">
      <div className="os-chart-donut-plot">{chart}</div>
      <div className="os-chart-donut-legend">{legend}</div>
    </div>
  );
});
