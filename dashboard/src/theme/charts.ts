// Chart colours, both modes - the canvas half of the colour system. Canvas cannot resolve
// var(), so chrome values are restated from dashboard.css; charts.test.ts holds them in step.
//
// Three axes, no chart takes more than two:
//   - STRUCTURAL, blue/tangerine: what the chain is - calls, puts, dealer gamma, skew
//   - OUTCOME, green/red: what happened; chrome only (--pos/--neg), on canvas only as levelKey
//   - REFERENCE, violet/teal: anything with no side - implied vol, basis, a prior snapshot;
//     warn (ochre) is emphasis without direction
//
// Colour is never the only cue; s1..s8 are assigned by expiry index within a chart.

import { DEFAULT_THEME, type ThemeMode } from './mode';

export const MONO = "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

interface Base {
  // chrome, held low-contrast
  grid: string;
  axis: string;
  label: string;
  text: string;
  zero: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipShadow: string;
  // sparkline wash; alpha per mode, a step visible on white vanishes near black
  sparkFill: string;

  // structural axis; soft is the lighter partner for a stacked ITM segment
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

export type ChartColors = Base &
  Slots & {
    palette: string[];
    // ordered magnitude, single hue
    sequential: string[];
  };

type Ramp = readonly [string, string, string, string, string, string, string, string];

// named slots and the palette array from one ramp, so they cannot drift
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

const LIGHT: ChartColors = {
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

// not the light values lightened: accents gain saturation with luminance, neutrals go cool
// because warm greys turn brown on black
const DARK: ChartColors = {
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

export const THEMES: Record<ThemeMode, ChartColors> = { light: LIGHT, dark: DARK };

/**
 * The live colours. Read them at render time - `colors.call`, never `const { call } = colors` at
 * module scope, or the value freezes at import and stops following the theme.
 */
export const colors: ChartColors = { ...THEMES[DEFAULT_THEME] };

export function setChartTheme(mode: ThemeMode): void {
  Object.assign(colors, THEMES[mode]);
}

export const axisLabelStyle = () => ({ color: colors.label, fontFamily: MONO, fontSize: 12 });

export const tooltipStyle = () => ({
  backgroundColor: colors.tooltipBg,
  borderColor: colors.tooltipBorder,
  borderWidth: 1,
  extraCssText: `box-shadow: 0 4px 16px ${colors.tooltipShadow}; border-radius: 6px;`,
  textStyle: { color: colors.text, fontFamily: MONO, fontSize: 13 },
});
