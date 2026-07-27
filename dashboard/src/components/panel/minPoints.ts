// how many points a chart needs before it says anything useful
// values are per chart kind, not per panel
export const MIN_POINTS = {
  bars: 1,
  line: 2,
  series: 3,
  family: 4,
} as const;
