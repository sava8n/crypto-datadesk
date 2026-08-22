// iv30(t) against the rv30 observed at t+30d, which covers (t, t+30d]

import type { VolHistoryPoint } from '../../types';
import { MS_PER_DAY } from '../../utils/constants';

export interface VRPRow {
  asOf: string;
  spot: number;
  iv30: number;
  // rv30 observed one horizon after asOf
  rv30Fwd: number;
  vrp: number;
}

export function pairForwardRealized(
  points: VolHistoryPoint[],
  horizonDays = 30,
  toleranceDays = 2,
): VRPRow[] {
  const times = points.map((p) => new Date(p.as_of).getTime());
  const rows: VRPRow[] = [];
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
    rows.push({
      asOf: point.as_of,
      spot: point.spot,
      iv30: point.iv30,
      rv30Fwd: rv,
      vrp: point.iv30 - rv,
    });
  }
  return rows;
}
