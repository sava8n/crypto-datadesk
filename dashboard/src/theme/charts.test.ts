import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { type ChartTokens, THEMES } from './charts';

// Three things have to hold, and all three are measured rather than asserted by eye:
//   - colours sharing one chart can be told apart. 20 dE is roughly "clearly a different
//     colour" rather than "a shade of the same one";
//   - the structural pair keeps its separation for the ~1 in 12 men with a red-green
//     deficiency, which is the whole reason calls and puts are blue/tangerine;
//   - the ordered ramps really are ordered, so a mid-tone never reads brighter than an extreme.
// Both themes are checked: dark is not the light palette lightened.

const rgb = (hex: string) =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const lab = (hex: string) => {
  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  const [r, g, b] = rgb(hex).map(channel);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
  const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
  const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};

const distance = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

const lightness = (hex: string) => lab(hex)[0];

// Viénot linear approximations - enough to tell a pair that holds from one that collapses
const hex = (a: number[]) =>
  `#${a
    .map((v) =>
      Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
const bytes = (h: string) => rgb(h).map((v) => v * 255);
const deuter = (h: string) => {
  const [r, g, b] = bytes(h);
  return hex([0.625 * r + 0.375 * g, 0.7 * r + 0.3 * g, 0.3 * g + 0.7 * b]);
};
const protan = (h: string) => {
  const [r, g, b] = bytes(h);
  return hex([0.567 * r + 0.433 * g, 0.558 * r + 0.442 * g, 0.242 * g + 0.758 * b]);
};

// The tokens that share one chart, so they are the pairs that must stay apart. Which axis each
// chart takes is the system's chart-assignment table: structural for what the chain is, outcome
// for what happened, reference for what has no side to it.
// The flow and OI-change charts look like outcome charts but are not: their two series are
// calls and puts, and whether flow was bought or OI was built is the sign of the bar. So they
// take the structural pair, like the OI and volume charts they sit beside.
const CHARTS: Record<string, (keyof ChartTokens)[]> = {
  volHistory: ['s1', 's2', 's3', 's5', 'label'],
  // the same vocabulary as the live skew panel, so RR stays blue and BF violet across both
  skewHistory: ['call', 'callSoft', 'ref', 'zero'],
  vrp: ['ref', 's2', 's3', 'zero'],
  // three level lines over the signed net-gamma bars, so the structural pair is on it too
  gexLevelsHistory: ['text', 'levelKey', 'ref', 'call', 'put'],
  // levelKey is in these two now: it used to *be* the put colour, so a flip or max-pain rule
  // could only separate itself by dashing. On the structural pair it is a third hue and has to
  // measure up like one.
  exposureByStrike: ['call', 'put', 'text', 'levelKey'],
  oiByStrike: ['callSoft', 'call', 'putSoft', 'put', 'levelKey'],
  oiHistory: ['call', 'put', 'ref'],
  probDistribution: ['s1', 'warn', 'label'],
  flowByStrike: ['call', 'put', 'zero'],
  oiChange: ['call', 'put', 'zero'],
  skew: ['call', 'put', 'ref', 'label', 'zero'],
  smileCompare: ['ref', 's2'],
  basis: ['ref', 'zero'],
};

const CASES = Object.entries(THEMES).flatMap(([mode, tokens]) =>
  Object.entries(CHARTS).map(([chart, keys]) => ({
    label: `${mode} · ${chart}`,
    colors: keys.map((k) => tokens[k] as string),
  })),
);

describe('separation inside one chart', () => {
  it.each(CASES)('$label keeps every pair distinguishable', ({ colors }) => {
    for (let i = 0; i < colors.length; i++) {
      for (let j = i + 1; j < colors.length; j++) {
        expect(distance(colors[i], colors[j])).toBeGreaterThanOrEqual(20);
      }
    }
  });
});

describe('categorical palette', () => {
  // What the ramp promises is that *adjacent* entries never share a neighbourhood, which is
  // what matters when curves are assigned by expiry index. With blue, tangerine, green and red
  // all reserved by the three axes, the eight remaining hues are crowded: s3 (plum) and s6
  // (mulberry) sit 10.8 dE apart in light and 8.0 in dark, the ramp's worst pair by some way. A
  // chart that picks slots by hand rather than by index must not put those two together, and
  // CHARTS above does not.
  it.each(Object.entries(THEMES))('%s separates neighbouring slots', (_mode, tokens) => {
    for (let i = 1; i < tokens.palette.length; i++) {
      expect(distance(tokens.palette[i - 1], tokens.palette[i])).toBeGreaterThanOrEqual(25);
    }
  });

  // held at the ramp's own floor, so it cannot drift closer together than it already is
  it.each(Object.entries(THEMES))('%s keeps its worst pair no worse', (_mode, tokens) => {
    for (let i = 0; i < tokens.palette.length; i++) {
      for (let j = i + 1; j < tokens.palette.length; j++) {
        expect(distance(tokens.palette[i], tokens.palette[j])).toBeGreaterThanOrEqual(7);
      }
    }
  });
});

// a textbook emerald/crimson, the pair the structural axis is measured against
const NAIVE: Record<string, [string, string]> = {
  light: ['#157F4C', '#B3242B'],
  dark: ['#46B583', '#E06A56'],
};

const retention = ([a, b]: [string, string], simulate: (h: string) => string) =>
  distance(simulate(a), simulate(b)) / distance(a, b);

describe('the structural pair survives colour vision deficiency', () => {
  it.each(Object.entries(THEMES))('%s keeps most of its separation', (_mode, t) => {
    for (const simulate of [deuter, protan]) {
      // measured: blue/tangerine actually *gains* under both, by 13-31%
      expect(retention([t.call, t.put], simulate)).toBeGreaterThanOrEqual(0.75);
    }
  });

  it.each(Object.entries(THEMES))('%s beats a naive emerald/crimson pair', (mode, t) => {
    // which keeps barely half under protanopia - the whole reason calls and puts left green/red
    for (const simulate of [deuter, protan]) {
      expect(retention([t.call, t.put], simulate)).toBeGreaterThan(
        retention(NAIVE[mode], simulate) + 0.1,
      );
    }
  });

  it.each(Object.entries(THEMES))('%s separates in greyscale too', (_mode, t) => {
    // a luminance offset, so the pair does not rely on hue alone
    expect(Math.abs(lightness(t.call) - lightness(t.put))).toBeGreaterThanOrEqual(5);
  });
});

describe('the sequential ramp stays ordered', () => {
  it.each(Object.entries(THEMES))('%s steps monotonically', (_mode, t) => {
    const ls = t.sequential.map(lightness);
    const descending = ls.every((v, i) => i === 0 || v < ls[i - 1]);
    const ascending = ls.every((v, i) => i === 0 || v > ls[i - 1]);
    expect(descending || ascending).toBe(true);
  });
});

// the chrome values canvas needs are restated from dashboard.css; this is what keeps the two
// copies one
const css = readFileSync(new URL('./dashboard.css', import.meta.url), 'utf8');

const cssToken = (selector: string, name: string): string | undefined => {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf('\n}', start));
  return block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim().toLowerCase();
};

const SHARED: [keyof ChartTokens, string][] = [
  ['text', '--ink'],
  ['label', '--label'],
  ['axis', '--rule-strong'],
  ['tooltipBg', '--overlay'],
  ['tooltipBorder', '--rule'],
  ['tooltipShadow', '--shadow'],
  ['call', '--regime-long'],
  ['put', '--regime-short'],
  ['levelKey', '--neg'],
  ['warn', '--warn'],
];

describe('the two halves of the colour system agree', () => {
  it.each([
    ['light', ':root'],
    ['dark', ':root[data-theme="dark"]'],
  ] as const)('%s restates the stylesheet', (mode, selector) => {
    for (const [token, name] of SHARED) {
      expect(String(THEMES[mode][token]).toLowerCase(), `${token} vs ${name}`).toBe(
        cssToken(selector, name),
      );
    }
  });
});

describe('the two modes stay in step', () => {
  it('declares the same tokens in light and dark', () => {
    expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(THEMES.light).sort());
  });

  it('keeps the named slots and the palette array in step', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.palette).toEqual([t.s1, t.s2, t.s3, t.s4, t.s5, t.s6, t.s7, t.s8]);
    }
  });

  // the reference hue is a ramp slot wearing a semantic name. warn is no longer a slot: ochre
  // would sit too close to the umber the ramp already carries, so emphasis holds its own hue
  // outside the eight, and so does levelKey.
  it('aliases ref to s1', () => {
    for (const t of Object.values(THEMES)) {
      expect(t.ref).toBe(t.s1);
    }
  });
});
