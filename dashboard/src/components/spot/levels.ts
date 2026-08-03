import type {
  GEXByStrikeResponse,
  OIByStrikePoint,
  OIByStrikeResponse,
  ProbCurvesResponse,
} from '../../types';
import type { Settings } from '../../config';
import { CALL, PUT, FLIP, MAX_PAIN } from '../../theme/charts';
import { expiryLabel, countShort, usdShort } from '../../utils/format';

export type LevelConfig = Settings['levels'];

export interface PriceLevel {
  price: number;
  title: string;
  color: string;
}

export interface QuantileBand {
  p16: number | null;
  p50: number | null;
  p84: number | null;
}

// heaviest strike by the picked OI measure; undefined when nothing carries OI
function wall(
  pts: OIByStrikePoint[],
  pick: (p: OIByStrikePoint) => number,
): { strike: number; oi: number } | undefined {
  return pts
    .map((p) => ({ strike: p.strike, oi: pick(p) }))
    .filter((w) => w.oi > 0)
    .reduce<{ strike: number; oi: number } | undefined>(
      (best, w) => (best && best.oi >= w.oi ? best : w),
      undefined,
    );
}

// Biggest strike by weight. Median of the run of comparably big neighbors
// (gap <= gexClusterMaxGap grid steps, weight >= gexClusterMinWeight of the max)
// when such a stack exists. Weight is summed over the cluster.
function clusterLevel(
  pts: { strike: number; weight: number }[],
  cfg: LevelConfig,
): { price: number; weight: number } | undefined {
  const grid = pts.map((p) => p.strike).sort((a, b) => a - b);
  const steps = grid
    .slice(1)
    .map((s, i) => s - grid[i])
    .sort((a, b) => a - b);
  const maxGap = cfg.gexClusterMaxGap * (steps[Math.floor(steps.length / 2)] ?? 0);

  const sorted = pts.filter((p) => p.weight > 0).sort((a, b) => a.strike - b.strike);
  if (sorted.length === 0) return undefined;

  let peak = 0;
  for (let i = 1; i < sorted.length; i++) if (sorted[i].weight > sorted[peak].weight) peak = i;
  const minWeight = cfg.gexClusterMinWeight * sorted[peak].weight;

  let lo = peak;
  while (lo > 0 && sorted[lo].strike - sorted[lo - 1].strike <= maxGap && sorted[lo - 1].weight >= minWeight) lo--;
  let hi = peak;
  while (hi < sorted.length - 1 && sorted[hi + 1].strike - sorted[hi].strike <= maxGap && sorted[hi + 1].weight >= minWeight) hi++;

  const cluster = sorted.slice(lo, hi + 1);
  const mid = (cluster.length - 1) / 2;
  return {
    price: (cluster[Math.floor(mid)].strike + cluster[Math.ceil(mid)].strike) / 2,
    weight: cluster.reduce((sum, p) => sum + p.weight, 0),
  };
}

function deduplicate(levels: PriceLevel[], tolerance: number): PriceLevel[] {
  const kept: PriceLevel[] = [];
  for (const lvl of levels) {
    if (!kept.some((k) => Math.abs(lvl.price - k.price) <= tolerance)) kept.push(lvl);
  }
  return kept;
}

// options-derived levels for the market strip:
// - GEX flip (whole chain)
// - front-expiry max pain
// - front-expiry call/put OI walls
// - clustered call-GEX resistance / put-GEX support (whole chain)
// expects the assumption convention (call_gex >= 0, put_gex <= 0); the strip
// always fetches it, so flow-signed data never reaches these weights
export function buildLevels(
  gex: GEXByStrikeResponse | undefined,
  oiAll: OIByStrikeResponse | undefined,
  oiFront: OIByStrikeResponse | undefined,
  cfg: LevelConfig,
): PriceLevel[] {
  const spot = gex?.spot ?? oiAll?.spot;
  const inRange = (p: number) => spot != null && Math.abs(p / spot - 1) <= cfg.range;

  const levels: PriceLevel[] = [];

  if (gex?.gex_flip != null && inRange(gex.gex_flip)) {
    levels.push({ price: gex.gex_flip, title: 'GEX FLIP', color: FLIP });
  }

  if (oiFront?.max_pain != null && oiFront.expiry != null && inRange(oiFront.max_pain)) {
    levels.push({
      price: oiFront.max_pain,
      title: `MAX PAIN ${expiryLabel(oiFront.expiry)}`,
      color: MAX_PAIN,
    });
  }

  if (spot != null && oiFront) {
    const eligible = oiFront.points.filter((p) => inRange(p.strike));
    const callWall = wall(
      eligible.filter((p) => p.strike >= spot),
      (p) => p.itm_calls + p.otm_calls,
    );
    if (callWall) {
      levels.push({ price: callWall.strike, title: `CALL WALL ${countShort(callWall.oi)}`, color: CALL });
    }
    const putWall = wall(
      eligible.filter((p) => p.strike <= spot),
      (p) => p.itm_puts + p.otm_puts,
    );
    if (putWall) {
      levels.push({ price: putWall.strike, title: `PUT WALL ${countShort(putWall.oi)}`, color: PUT });
    }
  }

  if (spot != null && gex) {
    const eligible = gex.points.filter((p) => inRange(p.strike));
    // call GEX is already positive above spot, so its weight needs no sign flip
    const resistance = clusterLevel(
      eligible.filter((p) => p.strike >= spot).map((p) => ({ strike: p.strike, weight: p.call_gex })),
      cfg,
    );
    if (resistance) {
      levels.push({
        price: resistance.price,
        title: `GEX RES ${usdShort(resistance.weight)}`,
        color: CALL,
      });
    }
    // dealers are short put gamma, so put GEX is negative, magnitude is the weight
    const support = clusterLevel(
      eligible.filter((p) => p.strike <= spot).map((p) => ({ strike: p.strike, weight: -p.put_gex })),
      cfg,
    );
    if (support) {
      levels.push({
        price: support.price,
        title: `GEX SUP ${usdShort(support.weight)}`,
        color: PUT,
      });
    }
  }

  return deduplicate(levels, cfg.tolerance);
}

// implied p16/p50/p84 at the front expiry
export function buildQuantileBand(
  prob: ProbCurvesResponse | undefined,
  expiry: string | undefined,
): QuantileBand | undefined {
  if (!prob?.quantiles?.length || !expiry) return undefined;
  const target = Date.parse(expiry);
  const row = [...prob.quantiles].sort(
    (a, b) =>
      Math.abs(Date.parse(a.expiry) - target) - Math.abs(Date.parse(b.expiry) - target),
  )[0];
  return { p16: row.p16, p50: row.p50, p84: row.p84 };
}
