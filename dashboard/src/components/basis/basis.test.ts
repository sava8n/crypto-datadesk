import { describe, expect, it } from 'vitest';
import type { TermStructureResponse } from '../../types';
import { buildBasisRows } from './basis';

const resp = (
  spot: number,
  points: { expiry?: string; tte_years: number; forward: number }[],
): TermStructureResponse => ({
  currency: 'BTC',
  spot,
  as_of: '2026-07-26T00:00:00Z',
  points: points.map((p, i) => ({
    expiry: p.expiry ?? `E${i}`,
    tte_years: p.tte_years,
    atm_iv: 0.5,
    forward: p.forward,
  })),
});

describe('buildBasisRows', () => {
  it('computes basis as F/S - 1 and annualizes by tte', () => {
    const [row] = buildBasisRows(resp(100, [{ tte_years: 0.5, forward: 105 }]));
    expect(row.basis).toBeCloseTo(0.05);
    expect(row.basisAnn).toBeCloseTo(0.1);
    expect(row.dte).toBeCloseTo(182.625);
  });

  it('reports backwardation as a negative basis', () => {
    const [row] = buildBasisRows(resp(100, [{ tte_years: 0.5, forward: 95 }]));
    expect(row.basis).toBeCloseTo(-0.05);
    expect(row.basisAnn).toBeCloseTo(-0.1);
  });

  it('drops expired points, whose annualization is undefined', () => {
    const rows = buildBasisRows(
      resp(100, [
        { tte_years: 0, forward: 101 },
        { tte_years: 0.5, forward: 105 },
      ]),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].dte).toBeGreaterThan(0);
  });

  it('returns nothing when spot is missing, rather than dividing by zero', () => {
    expect(buildBasisRows(resp(0, [{ tte_years: 0.5, forward: 105 }]))).toEqual([]);
  });

  it('sorts near-dated first', () => {
    const rows = buildBasisRows(
      resp(100, [
        { expiry: 'FAR', tte_years: 1, forward: 110 },
        { expiry: 'NEAR', tte_years: 0.1, forward: 101 },
      ]),
    );
    expect(rows.map((r) => r.expiry)).toEqual(['NEAR', 'FAR']);
  });

  it('blows the annualized basis up as tte approaches zero, without producing NaN', () => {
    const [row] = buildBasisRows(resp(100, [{ tte_years: 1e-6, forward: 100.1 }]));
    expect(Number.isFinite(row.basisAnn)).toBe(true);
    expect(row.basisAnn).toBeGreaterThan(100);
  });
});
