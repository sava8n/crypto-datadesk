// index of the strike nearest a price level (for a level that falls between
// strikes); ties resolve to the first (lowest-index) strike. -1 for an empty list.
export function nearestIdx(strikes: number[], level: number): number {
  let best = -1;
  let bestDist = Infinity;
  strikes.forEach((k, i) => {
    const d = Math.abs(k - level);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}
