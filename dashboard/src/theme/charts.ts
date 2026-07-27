// Chart tokens for the amber-terminal theme

export const MONO = 'monospace';

// -- palette --------------------------------------------------------------

export const AMBER = '#ffb000';
export const GRID = '#243133';
export const AXIS_LINE = '#3a4a4d';
export const BLACK = '#000000';
export const PANEL_BG = '#0b0e10';

// legend/label text on multi-series charts
export const TEXT = '#c8d0d0';

// muted line, brighter than the gridlines: zero references and spot markers
export const MUTED = '#6c7a7a';

export const DANGER = '#ff3b30';
export const VIOLET = '#b06cf0';
export const UP = '#33ff66';
export const DOWN = DANGER;

// call/put split: calls = teal, puts = amber; ITM brighter, OTM deeper
export const CALL = '#5fded0';
export const CALL_DEEP = '#178f80';
export const PUT = '#ffcf4d';
export const PUT_DEEP = '#c8860b';

// categorical palette for multi-expiry line charts, one color per series
export const PALETTE = [
  '#ffb000', '#4aa3ff', '#33ff66', '#ff6b6b', '#b388ff',
  '#ffd24a', '#2ee6c5', '#ff8adf', '#7cff4a', '#ff9d4a',
  '#6ce5ff', '#c0c8c8', '#e05aff', '#f0f0f0', '#8fa0ff',
  '#d4b483',
];

// -- semantic aliases -----------------------------------------------------

// gamma-flip (zero-gamma) level
export const FLIP = DANGER;
// max-pain strike
export const MAX_PAIN = VIOLET;
// intrinsic-value overlay axis on the OI chain
export const INTRINSIC = DANGER;
// net GEX line
export const NET_GEX = VIOLET;
// distribution tail buckets
export const TAIL = PUT_DEEP;

// per-greek series colors;
export const GREEK_COLORS = {
  delta: '#4aa3ff',
  gamma: '#33ff66',
  theta: '#ff6b6b',
  vega: '#ffb000',
} as const;

// -- text styles ----------------------------------------------------------

export const axisLabelStyle = { color: AMBER, fontFamily: MONO, fontSize: 11 };
export const axisNameStyle = { color: AMBER, fontFamily: MONO, fontSize: 13 };

// base tooltip box; panels add trigger/formatter
export const tooltipStyle = {
  backgroundColor: PANEL_BG,
  borderColor: GRID,
  borderWidth: 1,
  textStyle: { color: AMBER, fontFamily: MONO, fontSize: 12 },
};
