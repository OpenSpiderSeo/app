/** Score ring + progress — number stays upright (SVG arc rotates separately). */
import { memo, useEffect, useState } from 'react';
import { healthScoreStrokeVar } from '../../shared/utils/honor-rank.utils';

export const ScoreRing = memo(function ScoreRing({
  score,
  label,
  size = 96,
  pending = false,
}: {
  score: number;
  label: string;
  size?: number;
  pending?: boolean;
}) {
  const clamped = pending ? 0 : Math.max(0, Math.min(100, Math.round(score)));
  const stroke = Math.max(6, Math.round(size * 0.07));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const targetOffset = c - (clamped / 100) * c;
  const [offset, setOffset] = useState(c);
  const tone = pending ? 'var(--os-muted)' : healthScoreStrokeVar(clamped);
  const fontSize = Math.round(size * 0.28);

  useEffect(() => {
    if (pending) return;
    const id = requestAnimationFrame(() => setOffset(targetOffset));
    return () => cancelAnimationFrame(id);
  }, [targetOffset, pending]);

  return (
    <div className={`score-ring${pending ? ' score-ring--pending' : ''}`}>
      <div className="score-ring__wrap" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="score-ring__svg"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--os-panel-2)"
            strokeWidth={stroke}
          />
          <circle
            className="score-ring__arc"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={tone}
            strokeWidth={stroke}
            strokeDasharray={c}
            strokeDashoffset={pending ? c : offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="score-ring__value" style={{ fontSize }}>
          {pending ? '—' : clamped}
        </div>
      </div>
      <div className="score-ring__label">{label}</div>
    </div>
  );
});

export const ProgressBar = memo(function ProgressBar({
  value,
  label,
  hint,
}: {
  value: number | null;
  label: string;
  hint?: string;
}) {
  const pending = value === null;
  const clamped = pending ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const zero = !pending && clamped === 0;
  return (
    <div
      className={`os-progress${pending ? ' os-progress--pending' : ''}${zero ? ' os-progress--zero' : ''}`}
    >
      <div className="os-progress__head">
        <span className="os-progress__label">{label}</span>
        <span className="os-progress__pct">{pending ? '—' : `${clamped}%`}</span>
      </div>
      <div
        className="os-progress__track"
        role="progressbar"
        aria-valuenow={pending ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-busy={pending || undefined}
        aria-label={label}
      >
        <div
          className="os-progress__fill"
          style={{ width: pending ? '0%' : `${clamped}%` }}
        />
      </div>
      {hint ? <p className="os-progress__hint">{hint}</p> : null}
    </div>
  );
});
