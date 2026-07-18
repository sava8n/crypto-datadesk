import { describe, it, expect } from 'vitest';
import { moneynessX, lerp, buildSurfaceData } from './surface';
import type { IVSurfacePoint } from '../../types';

describe('moneynessX', () => {
  it('maps calls to the positive wing and puts to the negative wing, symmetric at ATM', () => {
    expect(moneynessX(0.25, 'C')).toBeCloseTo(0.25);
    expect(moneynessX(-0.25, 'P')).toBeCloseTo(-0.25);
    expect(moneynessX(0.5, 'C')).toBeCloseTo(0); // ATM
    expect(moneynessX(-0.5, 'P')).toBeCloseTo(0); // ATM
  });
});

describe('lerp', () => {
  it('interpolates between nodes', () => {
    expect(lerp(1.5, [1, 2], [10, 20])).toBeCloseTo(15);
  });

  it('returns the node value at an exact node', () => {
    expect(lerp(2, [1, 2, 3], [10, 20, 30])).toBeCloseTo(20);
  });

  it('extrapolates flat past both ends', () => {
    expect(lerp(0, [1, 2], [10, 20])).toBe(10);
    expect(lerp(5, [1, 2], [10, 20])).toBe(20);
  });

  it('returns NaN for an empty series', () => {
    expect(lerp(1, [], [])).toBeNaN();
  });
});

const p = (delta: number, mark_iv: number, option_type: string, expiry = 'E1', tte = 0.1): IVSurfacePoint => ({
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
