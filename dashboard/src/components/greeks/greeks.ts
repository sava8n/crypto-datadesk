import type { GreekName } from '../../api/client';
import { GREEK_COLORS } from '../../theme/charts';

// Decimals track each greek's natural scale: 
// - gamma is per-unit-squared and tiny
// - delta is a fraction
// - theta and vega are currency per day / per vol point
export const GREEKS: { greek: GreekName; label: string; color: string; valueFmt: (v: number) => string }[] = [
  { greek: 'delta', label: 'DELTA', color: GREEK_COLORS.delta, valueFmt: (v) => v.toFixed(3) },
  { greek: 'gamma', label: 'GAMMA', color: GREEK_COLORS.gamma, valueFmt: (v) => v.toFixed(6) },
  { greek: 'theta', label: 'THETA', color: GREEK_COLORS.theta, valueFmt: (v) => v.toFixed(2) },
  { greek: 'vega', label: 'VEGA', color: GREEK_COLORS.vega, valueFmt: (v) => v.toFixed(2) },
];
