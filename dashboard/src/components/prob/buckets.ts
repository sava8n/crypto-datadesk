import type { ProbCurvePoint } from '../../types';
import { averageByStrike } from '../../utils/curves';
import { strikeFmt } from '../../utils/format';

export interface Bucket {
  label: string;
  prob: number;
  tail: boolean;
}

export interface BucketResult {
  buckets: Bucket[];
  spotBucket: number; // category holding spot; -1 when spot is off the quoted range
}

// Survival curve -> bar masses. Interior bucket: P(K1 < S <= K2) = P(S>K1) - P(S>K2).
// Open-ended tail buckets close the distribution to ~100%. A call and a put quoted at
// the same strike are averaged. Masses clamp at 0 (guard against a non-monotone curve).
export function buildBuckets(points: ProbCurvePoint[], spot: number): BucketResult {
  const curve = averageByStrike(points, (p) => p.prob_above);

  if (curve.length === 0) return { buckets: [], spotBucket: -1 };

  const first = curve[0];
  const last = curve[curve.length - 1];
  const buckets: Bucket[] = [
    { label: `<${strikeFmt(first[0])}`, prob: Math.max(0, 1 - first[1]), tail: true },
  ];
  for (let i = 0; i + 1 < curve.length; i += 1) {
    buckets.push({
      label: `${strikeFmt(curve[i][0])}–${strikeFmt(curve[i + 1][0])}`,
      prob: Math.max(0, curve[i][1] - curve[i + 1][1]),
      tail: false,
    });
  }
  buckets.push({ label: `>${strikeFmt(last[0])}`, prob: Math.max(0, last[1]), tail: true });

  let spotBucket = -1;
  for (let i = 0; i + 1 < curve.length; i += 1) {
    if (curve[i][0] < spot && spot <= curve[i + 1][0]) {
      spotBucket = i + 1; // +1: the low tail occupies category 0
      break;
    }
  }

  return { buckets, spotBucket };
}
