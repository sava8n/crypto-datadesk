// Chain points -> per-expiry curves. Calls and puts quoted at the 
// same strike are averaged, which is what makes a smile single-valued.

export interface StrikePoint {
  expiry: string;
  tte_years: number;
  strike: number;
}

export interface ExpiryCurve {
  expiry: string;
  tte: number;
  // [strike, value], ascending by strike
  points: [number, number][];
}

// average duplicate strikes, ascending
export function averageByStrike<T extends { strike: number }>(
  points: T[],
  pick: (p: T) => number,
): [number, number][] {
  const byStrike = new Map<number, number[]>();
  for (const p of points) {
    const values = byStrike.get(p.strike);
    if (values) values.push(pick(p));
    else byStrike.set(p.strike, [pick(p)]);
  }
  return [...byStrike.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([strike, values]) => [strike, values.reduce((s, v) => s + v, 0) / values.length]);
}

// one curve per expiry, near-dated first
export function groupByExpiry<T extends StrikePoint>(
  points: T[],
  pick: (p: T) => number,
): ExpiryCurve[] {
  const byExpiry = new Map<string, T[]>();
  for (const p of points) {
    const rows = byExpiry.get(p.expiry);
    if (rows) rows.push(p);
    else byExpiry.set(p.expiry, [p]);
  }
  return [...byExpiry.entries()]
    .map(([expiry, rows]) => ({
      expiry,
      tte: rows[0].tte_years,
      points: averageByStrike(rows, pick),
    }))
    .sort((a, b) => a.tte - b.tte);
}
