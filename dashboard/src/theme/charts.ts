// Chart tokens for the light editorial theme

export const MONO = "'IBM Plex Mono', 'SF Mono', Menlo, monospace";

export const ACCENT = '#2f56d9';
export const GRID = '#eef0f2';
export const AXIS_LINE = '#d2d7de';
export const PANEL_BG = '#ffffff';

// legend/label text on multi-series charts
export const TEXT = '#1a1a1e';

// axis tick labels, zero references and spot markers
export const MUTED = '#8a9099';

export const DANGER = '#d93025';
export const VIOLET = '#7c3aed';
export const UP = '#188038';
export const DOWN = DANGER;

// call/put split: calls = blue, puts = yellow; ITM lighter, OTM deeper
export const CALL = '#618cf5';
export const CALL_DEEP = '#1652f0';
export const PUT = '#eace3d';
export const PUT_DEEP = '#c39c08';

// generic secondary series where blue is already taken (not call-side data)
export const CYAN = '#0aa2c0';

// categorical palette for multi-expiry line charts, one color per series.
// Ordered so adjacent legend neighbors stay distinguishable on white.
export const PALETTE = [
  '#2f56d9', '#d9a441', '#188038', '#d93025', '#7c3aed',
  '#0aa2c0', '#c2410c', '#b0398f', '#4d7c0f', '#155e9e',
  '#a16207', '#8c5cf0', '#be123c', '#0d9f6e', '#8f5b1a',
  '#d55181',
];


// gamma-flip (zero-gamma) level
export const FLIP = DANGER;
export const MAX_PAIN = VIOLET;
// intrinsic-value overlay axis on the OI chain
export const INTRINSIC = DANGER;
export const NET_EXPOSURE = VIOLET;
// distribution tail buckets
export const TAIL = PUT_DEEP;

// expected-move cone over the spot chart
export const CONE_FILL = 'rgba(47, 86, 217, 0.06)';
export const CONE_EDGE = 'rgba(47, 86, 217, 0.40)';
export const CONE_MID = 'rgba(47, 86, 217, 0.65)';
export const CONE_LABEL = 'rgba(26, 26, 30, 0.75)';


export const axisLabelStyle = { color: MUTED, fontFamily: MONO, fontSize: 13 };
export const axisNameStyle = { color: TEXT, fontFamily: MONO, fontSize: 15 };

// base tooltip box; panels add trigger/formatter
export const tooltipStyle = {
  backgroundColor: PANEL_BG,
  borderColor: '#e5e7eb',
  borderWidth: 1,
  extraCssText: 'box-shadow: 0 4px 16px rgba(26, 26, 30, 0.10); border-radius: 6px;',
  textStyle: { color: TEXT, fontFamily: MONO, fontSize: 14 },
};
