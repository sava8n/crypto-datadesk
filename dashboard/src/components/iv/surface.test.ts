import { describe, it, expect } from 'vitest';
import {
  buildSurfaceData,
  deltaLabel,
  expiryAt,
  interpolate,
  ivAxisBounds,
  moneynessX,
} from './surface';
import type { IVSurfacePoint, OptionType } from '../../types';

describe('moneynessX', () => {
  it('maps calls to the positive wing and puts to the negative wing, symmetric at ATM', () => {
    expect(moneynessX(0.25, 'C')).toBeCloseTo(0.25);
    expect(moneynessX(-0.25, 'P')).toBeCloseTo(-0.25);
    expect(moneynessX(0.5, 'C')).toBeCloseTo(0); // ATM
    expect(moneynessX(-0.5, 'P')).toBeCloseTo(0); // ATM
  });
});

describe('interpolate', () => {
  it('interpolates between nodes', () => {
    expect(interpolate(1.5, [1, 2], [10, 20])).toBeCloseTo(15);
  });

  it('returns the node value at an exact node', () => {
    expect(interpolate(2, [1, 2, 3], [10, 20, 30])).toBeCloseTo(20);
  });

  it('extrapolates flat past both ends', () => {
    expect(interpolate(0, [1, 2], [10, 20])).toBe(10);
    expect(interpolate(5, [1, 2], [10, 20])).toBe(20);
  });

  it('returns NaN for an empty series', () => {
    expect(interpolate(1, [], [])).toBeNaN();
  });
});

const p = (delta: number, mark_iv: number, option_type: OptionType, expiry = 'E1', tte = 0.1): IVSurfacePoint => ({
  expiry,
  tte_years: tte,
  delta,
  mark_iv,
  option_type,
});

describe('buildSurfaceData', () => {
  it('resamples a smile onto the shared grid and reports the extents', () => {
    // smile at x = -0.4/0/0.4 with iv .6/.5/.55
    const points = [p(-0.1, 0.6, 'P'), p(0.5, 0.5, 'C'), p(0.1, 0.55, 'C')];
    const { surfaceData, zMin, zMax, tteMin, tteMax } = buildSurfaceData(points, 3, 0.4);

    expect(surfaceData).toHaveLength(3); // gridPoints × 1 expiry
    expect(surfaceData.map((d) => d[0])).toEqual([
      expect.closeTo(-0.4),
      expect.closeTo(0),
      expect.closeTo(0.4),
    ]);
    expect(surfaceData.map((d) => d[2])).toEqual([
      expect.closeTo(0.6),
      expect.closeTo(0.5),
      expect.closeTo(0.55),
    ]);
    expect(zMin).toBeCloseTo(0.5);
    expect(zMax).toBeCloseTo(0.6);
    expect(tteMin).toBeCloseTo(0.1);
    expect(tteMax).toBeCloseTo(0.1);
  });

  it('averages IV where two quotes land on the same moneyness', () => {
    // two 10-delta calls -> same x = 0.4, iv averages to .55
    const points = [p(0.1, 0.5, 'C'), p(0.1, 0.6, 'C'), p(0.5, 0.4, 'C')];
    const { surfaceData } = buildSurfaceData(points, 3, 0.4);
    expect(surfaceData.map((d) => d[2])).toEqual([
      expect.closeTo(0.4), // flat extrapolation below the ATM node
      expect.closeTo(0.4),
      expect.closeTo(0.55),
    ]);
  });

  it('falls back to [0, 1] extents for no points', () => {
    const { surfaceData, zMin, zMax, tteMin, tteMax } = buildSurfaceData([], 3, 0.4);
    expect(surfaceData).toEqual([]);
    expect(zMin).toBe(0);
    expect(zMax).toBe(1);
    expect(tteMin).toBeUndefined();
    expect(tteMax).toBeUndefined();
  });
});

describe('deltaLabel', () => {
  it('names the ATM coordinate', () => {
    expect(deltaLabel(0)).toBe('ATM');
  });

  it('labels the put wing on the negative side and the call wing on the positive', () => {
    expect(deltaLabel(-0.25)).toBe('25p');
    expect(deltaLabel(0.25)).toBe('25c');
    expect(deltaLabel(0.4)).toBe('10c');
  });

  it('inverts moneynessX', () => {
    expect(deltaLabel(moneynessX(0.25, 'C'))).toBe('25c');
    expect(deltaLabel(moneynessX(-0.25, 'P'))).toBe('25p');
    expect(deltaLabel(moneynessX(0.5, 'C'))).toBe('ATM');
  });
});

describe('expiryAt', () => {
  it('projects a tte offset onto a calendar date', () => {
    const asOf = Date.parse('2026-07-26T00:00:00Z');
    expect(expiryAt(asOf, 0)).toBe('26 Jul 26');
  });

  it('advances by whole days', () => {
    const asOf = Date.parse('2026-07-26T00:00:00Z');
    expect(expiryAt(asOf, 7 / 365.25)).toBe('02 Aug 26');
  });
});

describe('ivAxisBounds', () => {
  it('rounds outward to whole 5% steps', () => {
    expect(ivAxisBounds(0.42, 0.61)).toEqual([0.4, 0.65]);
  });

  it('leaves an already-aligned range alone', () => {
    const [lo, hi] = ivAxisBounds(0.4, 0.6);
    expect(lo).toBeCloseTo(0.4);
    expect(hi).toBeCloseTo(0.6);
  });
});
