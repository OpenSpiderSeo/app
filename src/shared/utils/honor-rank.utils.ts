/** Health band from SEO health score — professional labels only. */
export const HealthBand = {
  Critical: 'critical',
  Weak: 'weak',
  Good: 'good',
  Excellent: 'excellent',
} as const;

export type HealthBandId = (typeof HealthBand)[keyof typeof HealthBand];

/** @deprecated use HealthBand */
export const HonorRank = HealthBand;
export type HonorRankId = HealthBandId;

export function healthBandFromScore(score: number | null | undefined): HealthBandId | null {
  if (score == null || Number.isNaN(score)) return null;
  const n = Math.max(0, Math.min(100, Math.round(score)));
  if (n >= 90) return HealthBand.Excellent;
  if (n >= 75) return HealthBand.Good;
  if (n >= 45) return HealthBand.Weak;
  return HealthBand.Critical;
}

/** @deprecated use healthBandFromScore */
export const honorRankFromHealth = healthBandFromScore;

/** Stroke / badge foreground CSS var for a health band. */
export function healthBandStrokeVar(band: HealthBandId): string {
  switch (band) {
    case HealthBand.Critical:
      return 'var(--os-bad)';
    case HealthBand.Weak:
      return 'var(--os-warn-fg)';
    case HealthBand.Good:
      return 'var(--os-accent)';
    case HealthBand.Excellent:
      return 'var(--os-ok)';
  }
}

/** Stroke color from score — single source for rings and badges. */
export function healthScoreStrokeVar(score: number | null | undefined): string {
  const band = healthBandFromScore(score);
  return band ? healthBandStrokeVar(band) : 'var(--os-muted)';
}
