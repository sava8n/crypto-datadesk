import type { CotMethod } from '../../api/client';

// index methods: classic min-max range position vs outlier-robust percentile rank
export const COT_METHODS: { value: CotMethod; label: string }[] = [
  { value: 'minmax', label: 'MIN-MAX' },
  { value: 'rank', label: 'RANK' },
];

export function methodLabel(method: string): string {
  return COT_METHODS.find((m) => m.value === method)?.label ?? method.toUpperCase();
}
