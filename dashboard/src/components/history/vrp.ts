// Forward-looking vol risk premium: what selling 30d vol at iv30(t) actually earned,
// measured by the realized vol observed 30 days later (rv30 at t+30d covers (t, t+30d]).

import { MS_PER_DAY } from '../../utils/constants';
import type { VolHistoryPoint } from '../../types';

export interface VrpRow {
  as_of: string;
  iv30: number;
  // rv30 observed one horizon after as_of
  rv30_fwd: number;
  vrp: number;
}

export function pairForwardRealized(
  points: VolHistoryPoint[],
  horizonDays = 30,
  toleranceDays = 2,
): VrpRow[] {
  const times = points.map((p) => new Date(p.as_of).getTime());
  const rows: VrpRow[] = [];
  let j = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (point.iv30 == null) continue;
    const target = times[i] + horizonDays * MS_PER_DAY;
    // both series are ascending, so the forward cursor never moves back
    if (j < i) j = i;
    while (j + 1 < points.length && times[j] < target) j++;
    // nearest of the two observations bracketing the target
    const best = j > 0 && target - times[j - 1] < times[j] - target ? j - 1 : j;
    if (Math.abs(times[best] - target) > toleranceDays * MS_PER_DAY) continue;
    const rv = points[best].rv30;
    if (rv == null) continue;
    rows.push({ as_of: point.as_of, iv30: point.iv30, rv30_fwd: rv, vrp: point.iv30 - rv });
  }
  return rows;
}
