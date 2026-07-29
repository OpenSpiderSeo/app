import { memo } from 'react';

export const ChartEmpty = memo(function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="os-chart-empty flex items-center justify-center text-center text-sm text-[var(--os-muted)]">
      {message}
    </div>
  );
});
