// calls and puts quoted at one strike are averaged, so a smile is single-valued

export interface StrikePoint {
  expiry: string;
  tte_years: number;
  strike: number;
}

export interface ExpiryCurve {
  expiry: string;
  tte: number;
  points: [number, number][];
}

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
