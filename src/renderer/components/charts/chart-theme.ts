/** OpenSpider chart palette — carbon dark + red accent (#e11d2e). */
export const CHART = {
  accent: '#e11d2e',
  accentSoft: 'rgba(225, 29, 46, 0.35)',
  bad: '#db3b3e',
  warn: '#f7b750',
  ok: '#17c964',
  info: '#8b949e',
  muted: '#6b7280',
  grid: 'rgba(255, 255, 255, 0.06)',
  axis: '#9ca3af',
  panel: '#242321',
  tooltipBg: '#1a1918',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)',
} as const;

export const SEVERITY_COLORS = {
  error: CHART.bad,
  warning: CHART.warn,
  info: CHART.info,
} as const;

export const HTTP_STATUS_COLORS: Record<string, string> = {
  '2xx': CHART.ok,
  '3xx': '#60a5fa',
  '4xx': CHART.warn,
  '5xx': CHART.bad,
  other: CHART.muted,
};

export const chartMargin = { top: 12, right: 12, left: 0, bottom: 8 } as const;

export const barChartMargin = { top: 12, right: 8, left: -4, bottom: 4 } as const;

/** Fixed plot height — pairs with .os-chart-bar-plot CSS; avoids Recharts 0-height void. */
export const CHART_BAR_HEIGHT = 200;

export const chartTooltipStyle = {
  backgroundColor: CHART.tooltipBg,
  border: `1px solid ${CHART.tooltipBorder}`,
  borderRadius: 8,
  fontSize: 12,
  color: '#e5e7eb',
} as const;
