// Shared ECharts styling for the amber-terminal chart theme

export const AMBER = '#ffb000';
export const GRID = '#243133';
export const AXIS_LINE = '#3a4a4d';
export const MONO = 'monospace';

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

// OI moneyness buckets: calls = teal, puts = amber; ITM brighter, OTM deeper
export const OI_SERIES = [
  { key: 'itm_calls', name: 'ITM Calls', color: '#5fded0', stack: 'calls' },
  { key: 'otm_calls', name: 'OTM Calls', color: '#178f80', stack: 'calls' },
  { key: 'itm_puts', name: 'ITM Puts', color: '#ffcf4d', stack: 'puts' },
  { key: 'otm_puts', name: 'OTM Puts', color: '#c8860b', stack: 'puts' },
] as const;
