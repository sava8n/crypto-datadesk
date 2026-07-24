// Shared ECharts styling for the amber-terminal chart theme

export const AMBER = '#ffb000';
export const GRID = '#243133';
export const AXIS_LINE = '#3a4a4d';
export const MONO = 'monospace';

// legend/label text on multi-series charts
export const TEXT = '#c8d0d0';

// categorical palette for multi-expiry line charts, one color per series
export const PALETTE = [
  '#ffb000', '#4aa3ff', '#33ff66', '#ff6b6b', '#b388ff',
  '#ffd24a', '#2ee6c5', '#ff8adf', '#7cff4a', '#ff9d4a',
  '#6ce5ff', '#c0c8c8', '#e05aff', '#f0f0f0', '#8fa0ff',
  '#d4b483',
];

export const axisLabelStyle = { color: AMBER, fontFamily: MONO, fontSize: 11 };
export const axisNameStyle = { color: AMBER, fontFamily: MONO, fontSize: 13 };

// base tooltip box; panels add trigger/formatter
export const tooltipStyle = {
  backgroundColor: '#0b0e10',
  borderColor: GRID,
  borderWidth: 1,
  textStyle: { color: AMBER, fontFamily: MONO, fontSize: 12 },
};

// single-shade call/put split: calls = teal, puts = amber
export const CALL = '#5fded0';
export const PUT = '#ffcf4d';

// zero-reference line, brighter than the gridlines
export const ZERO = '#6c7a7a';

// gamma-flip (zero-gamma) line and max-pain strike
export const FLIP = '#ff3b30';
export const MAX_PAIN = '#b06cf0';

// OI moneyness buckets: calls = teal, puts = amber; ITM brighter, OTM deeper
export const OI_SERIES = [
  { key: 'itm_calls', name: 'ITM Calls', color: '#5fded0', stack: 'calls' },
  { key: 'otm_calls', name: 'OTM Calls', color: '#178f80', stack: 'calls' },
  { key: 'itm_puts', name: 'ITM Puts', color: '#ffcf4d', stack: 'puts' },
  { key: 'otm_puts', name: 'OTM Puts', color: '#c8860b', stack: 'puts' },
] as const;
