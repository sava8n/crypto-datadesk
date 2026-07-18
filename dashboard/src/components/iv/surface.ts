import type { IVSurfacePoint } from '../../types';

export interface SurfaceData {
  surfaceData: number[][]; // flat list of [x, tte, iv] over the rectangular grid
  zMin: number;
  zMax: number;
  tteMin: number | undefined;
  tteMax: number | undefined;
}

interface ExpiryRow {
  tte: number;
  xs: number[]; // moneyness coordinate
  ivs: number[];
}

// strike-monotonic delta coordinate: put wing at x < 0, 50-delta at x = 0, call wing at x > 0
export const moneynessX = (delta: number, optionType: string): number =>
  optionType === 'P' ? -(0.5 + delta) : 0.5 - delta;

// linear interpolation with flat extrapolation past the ends (xs must be ascending)
export function lerp(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (i < n && xs[i] < x) i += 1;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

// Group quotes by expiry and resample each smile onto a shared [-xLimit, xLimit]
// moneyness grid of gridPoints samples, so the surface is a regular rectangular
// mesh. Returns the flat [x, tte, iv] list plus IV and expiry-axis extents;
// zMin/zMax fall back to [0, 1] when there are no points.
export function buildSurfaceData(
  points: IVSurfacePoint[],
  gridPoints: number,
  xLimit: number,
): SurfaceData {
  const byExpiry = new Map<string, ExpiryRow>();
  for (const p of points) {
    let row = byExpiry.get(p.expiry);
    if (!row) {
      row = { tte: p.tte_years, xs: [], ivs: [] };
      byExpiry.set(p.expiry, row);
    }
    row.xs.push(moneynessX(p.delta, p.option_type));
    row.ivs.push(p.mark_iv);
  }
  const expiries = [...byExpiry.values()].sort((a, b) => a.tte - b.tte);

  const tteMin = expiries.length ? expiries[0].tte : undefined;
  const tteMax = expiries.length ? expiries[expiries.length - 1].tte : undefined;

  const xSamples = Array.from(
    { length: gridPoints },
    (_, i) => -xLimit + (2 * xLimit * i) / (gridPoints - 1),
  );

  const surfaceData: number[][] = [];
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const row of expiries) {
    const order = row.xs.map((_, i) => i).sort((a, b) => row.xs[a] - row.xs[b]);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const idx of order) {
      const x = row.xs[idx];
      const v = row.ivs[idx];
      if (xs.length && Math.abs(x - xs[xs.length - 1]) < 1e-9) {
        ys[ys.length - 1] = (ys[ys.length - 1] + v) / 2;
      } else {
        xs.push(x);
        ys.push(v);
      }
    }
    for (const x of xSamples) {
      const iv = lerp(x, xs, ys);
      if (iv < zMin) zMin = iv;
      if (iv > zMax) zMax = iv;
      surfaceData.push([x, row.tte, iv]);
    }
  }
  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 1;
  }

  return { surfaceData, zMin, zMax, tteMin, tteMax };
}
