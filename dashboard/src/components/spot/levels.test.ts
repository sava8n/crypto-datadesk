import { describe, it, expect } from 'vitest';
import { buildLevels, buildQuantileBand, type LevelConfig, type PriceLevel } from './levels';
import type {
  GEXByStrikePoint,
  GEXByStrikeResponse,
  OIByStrikePoint,
  OIByStrikeResponse,
  ProbCurvesResponse,
  ProbQuantileRow,
} from '../../types';

const summarize = (levels: PriceLevel[]) => levels.map(({ price, title }) => ({ price, title }));

const cfg: LevelConfig = {
  range: 0.3, // spot = 100 -> in-range strikes are [70, 130]
  tolerance: 1,
  gexClusterMinWeight: 0.5,
  gexClusterMaxGap: 1.5,
};

function gexResp(over: Partial<GEXByStrikeResponse> = {}): GEXByStrikeResponse {
  return {
    currency: 'BTC',
    spot: 100,
    as_of: '2026-07-18T00:00:00Z',
    flip: null,
    points: [],
    ...over,
  };
}

const gexPoint = (strike: number, call_gex: number, put_gex: number): GEXByStrikePoint => ({
  strike,
  call_gex,
  put_gex,
  net_gex: call_gex + put_gex,
});

function oiResp(over: Partial<OIByStrikeResponse> = {}): OIByStrikeResponse {
  return {
    currency: 'BTC',
    spot: 100,
    as_of: '2026-07-18T00:00:00Z',
    expiries: [],
    expiry: null,
    max_pain: null,
    points: [],
    ...over,
  };
}

const oiPoint = (strike: number, o: Partial<OIByStrikePoint>): OIByStrikePoint => ({
  strike,
  itm_calls: 0,
  otm_calls: 0,
  itm_puts: 0,
  otm_puts: 0,
  intrinsic_value: null,
  ...o,
});

describe('buildLevels', () => {
  it('returns nothing when spot is unknown', () => {
    expect(buildLevels(undefined, undefined, undefined, cfg)).toEqual([]);
  });

  describe('GEX flip', () => {
    it('emits an in-range flip', () => {
      expect(summarize(buildLevels(gexResp({ flip: 105 }), undefined, undefined, cfg))).toEqual([
        { price: 105, title: 'GEX FLIP' },
      ]);
    });

    it('drops a flip outside ±range of spot', () => {
      expect(buildLevels(gexResp({ flip: 200 }), undefined, undefined, cfg)).toEqual([]);
    });
  });

  describe('max pain', () => {
    it('emits the front-expiry max pain with a formatted expiry label', () => {
      const front = oiResp({ max_pain: 110, expiry: '2026-07-31T08:00:00Z' });
      expect(summarize(buildLevels(gexResp(), undefined, front, cfg))).toEqual([
        { price: 110, title: 'MAX PAIN 31JUL26' },
      ]);
    });

    it('drops max pain when the expiry is unknown', () => {
      const front = oiResp({ max_pain: 110, expiry: null });
      expect(buildLevels(gexResp(), undefined, front, cfg)).toEqual([]);
    });
  });

  describe('OI walls', () => {
    it('picks the heaviest in-range call and put strike on each side of spot', () => {
      const front = oiResp({
        points: [
          oiPoint(120, { otm_calls: 8000 }), // heaviest call, above spot
          oiPoint(110, { otm_calls: 5000 }),
          oiPoint(140, { otm_calls: 99999 }), // out of range (>130), ignored
          oiPoint(90, { otm_puts: 6000 }), // heaviest put, below spot
          oiPoint(80, { otm_puts: 4000 }),
        ],
      });
      expect(summarize(buildLevels(gexResp(), undefined, front, cfg))).toEqual([
        { price: 120, title: 'CALL WALL 8k' },
        { price: 90, title: 'PUT WALL 6k' },
      ]);
    });
  });

  describe('GEX clustering', () => {
    it('clusters call-GEX resistance above spot and put-GEX support below', () => {
      const gex = gexResp({
        points: [
          gexPoint(80, 0, -200_000),
          gexPoint(90, 0, -800_000), // dominant put-GEX -> support
          gexPoint(100, 0, 0),
          gexPoint(110, 1_000_000, 0), // dominant call-GEX -> resistance
          gexPoint(120, 200_000, 0), // below the 0.5×max weight cut, excluded
        ],
      });
      expect(summarize(buildLevels(gex, undefined, undefined, cfg))).toEqual([
        { price: 110, title: 'GEX RES $1M' },
        { price: 90, title: 'GEX SUP $800k' },
      ]);
    });

    it('takes the median strike and summed weight of a comparable run', () => {
      const gex = gexResp({
        points: [
          gexPoint(100, 1_000_000, 0),
          gexPoint(110, 1_000_000, 0),
          gexPoint(120, 1_000_000, 0),
        ],
      });
      // odd-length run -> middle strike; weight is the cluster sum
      expect(summarize(buildLevels(gex, undefined, undefined, cfg))).toEqual([
        { price: 110, title: 'GEX RES $3M' },
      ]);
    });

    it('stops the cluster at a gap wider than the grid allows', () => {
      const gex = gexResp({
        points: [
          gexPoint(100, 0, 0),
          gexPoint(105, 1_000_000, 0),
          gexPoint(110, 1_000_000, 0),
          gexPoint(130, 1_000_000, 0), // 20-wide gap > 1.5×median(5) step, excluded
        ],
      });
      // even-length run -> average of the two middle strikes (105, 110)
      expect(summarize(buildLevels(gex, undefined, undefined, cfg))).toEqual([
        { price: 107.5, title: 'GEX RES $2M' },
      ]);
    });
  });

  describe('deduplication', () => {
    it('collapses coincident levels within tolerance, keeping the first', () => {
      const gex = gexResp({ flip: 110 });
      const front = oiResp({ max_pain: 110.5, expiry: '2026-07-31T08:00:00Z' });
      expect(summarize(buildLevels(gex, undefined, front, cfg))).toEqual([
        { price: 110, title: 'GEX FLIP' },
      ]);
    });

    it('keeps levels farther apart than tolerance', () => {
      const gex = gexResp({ flip: 110 });
      const front = oiResp({ max_pain: 113, expiry: '2026-07-31T08:00:00Z' });
      expect(buildLevels(gex, undefined, front, cfg)).toHaveLength(2);
    });
  });

  it('falls back to oiAll for spot when gex is missing', () => {
    const front = oiResp({ max_pain: 110, expiry: '2026-07-31T08:00:00Z' });
    expect(summarize(buildLevels(undefined, oiResp({ spot: 100 }), front, cfg))).toEqual([
      { price: 110, title: 'MAX PAIN 31JUL26' },
    ]);
  });
});

function quantile(expiry: string, o: Partial<ProbQuantileRow> = {}): ProbQuantileRow {
  return { expiry, tte_years: 0.1, p16: null, p50: null, p84: null, ...o };
}
function probResp(quantiles: ProbQuantileRow[]): ProbCurvesResponse {
  return { currency: 'BTC', spot: 100, as_of: '2026-07-18T00:00:00Z', points: [], quantiles };
}

describe('buildQuantileBand', () => {
  it('selects the quantile row nearest the target expiry', () => {
    const prob = probResp([
      quantile('2026-07-10T08:00:00Z', { p16: 90, p50: 100, p84: 110 }),
      quantile('2026-07-31T08:00:00Z', { p16: 80, p50: 100, p84: 120 }),
    ]);
    expect(buildQuantileBand(prob, '2026-07-28T08:00:00Z')).toEqual({
      p16: 80,
      p50: 100,
      p84: 120,
    });
  });

  it('passes through null quantiles', () => {
    const prob = probResp([quantile('2026-07-31T08:00:00Z')]);
    expect(buildQuantileBand(prob, '2026-07-31T08:00:00Z')).toEqual({
      p16: null,
      p50: null,
      p84: null,
    });
  });

  it('returns undefined without data or a target expiry', () => {
    expect(buildQuantileBand(undefined, '2026-07-31T08:00:00Z')).toBeUndefined();
    expect(buildQuantileBand(probResp([]), '2026-07-31T08:00:00Z')).toBeUndefined();
    expect(buildQuantileBand(probResp([quantile('2026-07-31T08:00:00Z')]), undefined)).toBeUndefined();
  });
});
