import { useMemo } from 'react';

import { useSettings } from '../../settings/store';
import { filterByDte } from '../../utils/dte';

// a response with its points windowed by the DTE range from settings
export function useDteWindowed<R extends { points: { tte_years: number }[] }>(data: R | undefined) {
  const { minDte, maxDte } = useSettings();

  const windowed = useMemo(
    // the generic spread widens to Omit<R,'points'> & {points}, which TS can't see is R
    () => (data ? ({ ...data, points: filterByDte(data.points, minDte, maxDte) } as R) : undefined),
    [data, minDte, maxDte],
  );

  return { windowed, count: windowed?.points.length ?? 0 };
}
