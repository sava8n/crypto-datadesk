// Chart tokens, in both modes - the canvas half of the colour system. dashboard.css owns the
// chrome as custom properties; canvas cannot resolve var(), so the values a chart draws are
// restated here, and charts.test.ts holds the shared ones to the stylesheet.
//
// Three axes, and no chart takes more than two of them:
//   - STRUCTURAL, blue/tangerine: what the chain *is* - calls, puts, dealer gamma, skew. The
//     pair survives red-green deficiency and greyscale; charts.test.ts measures both.
//   - OUTCOME, green/red: what *happened* - a taker buy or sell, a gain, a failed request.
//     Chrome only (--pos/--neg in dashboard.css); it reaches canvas solely as levelKey.
//   - REFERENCE, violet/teal: anything with no side to it - implied vol, basis, a prior
//     snapshot. warn (ochre) is emphasis without a direction.
//
// Colour is never the only cue: sign also lives in bar direction or position about zero.
// s1..s8 are assigned by expiry index within a chart.

import type { ThemeMode } from './mode';

export const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

interface Base {
  // chrome: everything that is not data, held deliberately low-contrast
  grid: string;
  axis: string;
  label: string;
  text: string;
  zero: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  // wash under the strip sparkline; alpha is per mode, since a step the eye catches on white
  // vanishes near black
  sparkFill: string;

  // structural axis - soft is the reduced-weight partner for a stacked ITM segment
  call: string;
  callSoft: string;
  put: string;
  putSoft: string;
  // the outcome axis's loss colour, borrowed for gamma flip, max pain and the intrinsic overlay
  levelKey: string;
  // reference axis, and emphasis. ref aliases s1; warn is its own hue, outside the ramp.
  ref: string;
  warn: string;
}

type Slots = {
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  s5: string;
  s6: string;
  s7: string;
  s8: string;
};

export type ChartTokens = Base &
  Slots & {
    palette: string[];
    // ordered magnitude, single hue
    sequential: string[];
  };

type Ramp = readonly [string, string, string, string, string, string, string, string];

// one source for the eight hues: the named slots and the palette array cannot drift apart
const slots = (r: Ramp): Slots & { palette: string[] } => ({
  s1: r[0],
  s2: r[1],
  s3: r[2],
  s4: r[3],
  s5: r[4],
  s6: r[5],
  s7: r[6],
  s8: r[7],
  palette: [...r],
});

const LIGHT: ChartTokens = {
  grid: '#EDEDEB',
  axis: '#DCDCD9',
  label: '#8C8C86',
  text: '#232320',
  zero: '#C4C4C0',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E9E9E7',
  tooltipShadow: 'rgba(20, 20, 18, 0.1)',
  sparkFill: 'rgba(35, 35, 32, 0.09)',

  call: '#0F6BA8',
  callSoft: '#7FB2D9',
  put: '#C4700A',
  putSoft: '#E0A85E',
  levelKey: '#A63A14',
  ref: '#5D3A9B',
  warn: '#8A6D00',

  ...slots([
    '#5D3A9B', // violet, and the reference token
    '#0E7C74', // teal
    '#A6417F', // plum
    '#4A5A6E', // slate
    '#7A5C3E', // umber
    '#8A3A6B', // mulberry
    '#566B2E', // olive
    '#3B4A8C', // indigo
  ]),

  sequential: ['#E4F0EE', '#BEDDD8', '#93C7BF', '#63AB9F', '#318A7C', '#0E6B5F'],
};

// Not the light values lightened: a hue lightened toward a dark surface goes pastel, so each
// accent gains saturation as it gains luminance, and the neutrals turn cool because warm greys
// go brown on black.
const DARK: ChartTokens = {
  grid: '#202026',
  axis: '#33333C',
  label: '#7A7A85',
  text: '#F2F2F5',
  zero: '#45454F',
  tooltipBg: '#25252C',
  tooltipBorder: '#2A2A31',
  tooltipShadow: 'rgba(0, 0, 0, 0.55)',
  sparkFill: 'rgba(242, 242, 245, 0.2)',

  call: '#4DA3DB',
  callSoft: '#2E7099',
  put: '#F0A03A',
  putSoft: '#A8741C',
  levelKey: '#EF6B45',
  ref: '#A99BE8',
  warn: '#D9C05A',

  ...slots([
    '#A99BE8',
    '#52D0BF',
    '#E58BC4',
    '#93A6BC',
    '#C0A183',
    '#D48AB8',
    '#B8CC70',
    '#8E9BE0',
  ]),

  sequential: ['#102A28', '#164A44', '#1C6B60', '#248C7E', '#3AAD9C', '#6FD2C0'],
};

export const THEMES: Record<ThemeMode, ChartTokens> = { light: LIGHT, dark: DARK };

/**
 * The live token bag. Read it at render time - `C.call`, never `const { call } = C` at module
 * scope, or the value freezes at import and stops following the theme.
 */
export const C: ChartTokens = { ...LIGHT };

export function setChartTheme(mode: ThemeMode): void {
  Object.assign(C, THEMES[mode]);
}

export const axisLabelStyle = () => ({ color: C.label, fontFamily: MONO, fontSize: 12 });

// base tooltip box; panels add trigger/formatter
export const tooltipStyle = () => ({
  backgroundColor: C.tooltipBg,
  borderColor: C.tooltipBorder,
  borderWidth: 1,
  extraCssText: `box-shadow: 0 4px 16px ${C.tooltipShadow}; border-radius: 6px;`,
  textStyle: { color: C.text, fontFamily: MONO, fontSize: 13 },
});
