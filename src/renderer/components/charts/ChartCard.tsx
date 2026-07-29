import { memo, type ReactNode } from 'react';

export const ChartCard = memo(function ChartCard({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`os-chart-card admin-panel ${className}`.trim()}>
      <header className="os-chart-card__head">
        <h3 className="font-display text-sm font-medium">{title}</h3>
        {hint ? <p className="mt-0.5 text-[11px] text-[var(--os-muted)]">{hint}</p> : null}
      </header>
      <div className="os-chart-card__body">{children}</div>
    </article>
  );
});
