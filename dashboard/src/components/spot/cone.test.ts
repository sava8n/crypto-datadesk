import { describe, it, expect } from 'vitest';
import { buildCone, coneAnchor, type ConeAnchor } from './cone';
import type { ProbCurvesResponse, ProbQuantilePoint } from '../../types';

function quantile(expiry: string, o: Partial<ProbQuantilePoint> = {}): ProbQuantilePoint {
  return { expiry, tte_years: 0.1, p16: null, p50: null, p84: null, ...o };
}
function probResp(quantiles: ProbQuantilePoint[]): ProbCurvesResponse {
  return { currency: 'BTC', spot: 100, as_of: '2026-07-18T00:00:00Z', points: [], quantiles };
}

const anchor = (o: Partial<ConeAnchor> = {}): ConeAnchor => ({
  expiry: '2026-07-28T08:00:00Z',
  p16: 90,
  p50: 100,
  p84: 112,
  ...o,
});

describe('coneAnchor', () => {
  it('selects the quantile row nearest the target expiry', () => {
    const prob = probResp([
      quantile('2026-07-10T08:00:00Z', { p16: 90, p50: 100, p84: 110 }),
      quantile('2026-07-31T08:00:00Z', { p16: 80, p50: 100, p84: 120 }),
    ]);
    expect(coneAnchor(prob, '2026-07-28T08:00:00Z')).toEqual({
      expiry: '2026-07-31T08:00:00Z',
      p16: 80,
      p50: 100,
      p84: 120,
    });
  });

  it('passes through null quantiles', () => {
    const prob = probResp([quantile('2026-07-31T08:00:00Z')]);
    expect(coneAnchor(prob, '2026-07-31T08:00:00Z')).toEqual({
      expiry: '2026-07-31T08:00:00Z',
      p16: null,
      p50: null,
      p84: null,
    });
  });

  it('returns undefined without data or a target expiry', () => {
    expect(coneAnchor(undefined, '2026-07-31T08:00:00Z')).toBeUndefined();
    expect(coneAnchor(probResp([]), '2026-07-31T08:00:00Z')).toBeUndefined();
    expect(coneAnchor(probResp([quantile('2026-07-31T08:00:00Z')]), undefined)).toBeUndefined();
  });
});

describe('buildCone', () => {
  it('spans one daily bar per day from the last candle to the expiry date', () => {
    const cone = buildCone(100, anchor(), '2026-07-24');
    expect(cone.map((p) => p.time)).toEqual([
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
      '2026-07-27',
      '2026-07-28',
    ]);
  });

  it('collapses to spot at the near end and reproduces the quantiles at the expiry', () => {
    const cone = buildCone(100, anchor({ p16: 90, p50: 104, p84: 112 }), '2026-07-24');
    expect(cone[0]).toEqual({ time: '2026-07-24', lo: 100, mid: 100, hi: 100 });

    const last = cone[cone.length - 1];
    expect(last.lo).toBeCloseTo(90, 10);
    expect(last.mid).toBeCloseTo(104, 10);
    expect(last.hi).toBeCloseTo(112, 10);
  });

  it('opens as sqrt(t) around a driftless median', () => {
    // no drift, so the half-width is spot·(p84/spot)^sqrt(u); at u=1/4 that is the 4th root
    const cone = buildCone(100, anchor({ p16: 50, p50: 100, p84: 200 }), '2026-07-24');
    expect(cone[1].hi).toBeCloseTo(100 * 2 ** 0.5, 10); // u = 1/4 -> sqrt(u) = 1/2
    expect(cone[1].lo).toBeCloseTo(100 * 0.5 ** 0.5, 10);
  });

  it('leaves the cone driftless when the median is missing', () => {
    const cone = buildCone(100, anchor({ p16: 90, p50: null, p84: 112 }), '2026-07-24');
    expect(cone.every((p) => p.mid === 100)).toBe(true);
    expect(cone[cone.length - 1].hi).toBeCloseTo(112, 10);
  });

  it('drops only the edge the chain could not resolve', () => {
    const cone = buildCone(100, anchor({ p16: null }), '2026-07-24');
    expect(cone.every((p) => p.lo === null)).toBe(true);
    expect(cone[cone.length - 1].hi).toBeCloseTo(112, 10);
  });

  it('is empty once the expiry has rolled past the last candle', () => {
    expect(buildCone(100, anchor(), '2026-07-28')).toEqual([]);
    expect(buildCone(100, anchor(), '2026-08-01')).toEqual([]);
  });

  it('is empty without a usable spot', () => {
    expect(buildCone(0, anchor(), '2026-07-24')).toEqual([]);
    expect(buildCone(Number.NaN, anchor(), '2026-07-24')).toEqual([]);
  });
});
