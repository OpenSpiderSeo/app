import { memo } from 'react';

export type ChartLegendItem = {
  key: string;
  label: string;
  value: number | string;
  color: string;
};

export const ChartLegend = memo(function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <ul className="os-chart-legend">
      {items.map((item) => (
        <li key={item.key} className="os-chart-legend__item">
          <span className="os-chart-legend__swatch" style={{ background: item.color }} aria-hidden />
          <span className="os-chart-legend__text">
            {item.label}
            <span className="os-chart-legend__sep" aria-hidden>
              {' · '}
            </span>
            <span className="os-chart-legend__value">{item.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
});
