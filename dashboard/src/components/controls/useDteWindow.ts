import { useMemo } from 'react';

import { useChartScope } from '../../settings/store';
import { filterByDte } from '../../utils/dte';

export function useDteWindowed<R extends { points: { tte_years: number }[] }>(
  chartId: string,
  data: R | undefined,
) {
  const { scope } = useChartScope(chartId);
  const { minDte, maxDte } = scope;

  const windowed = useMemo(
    // the generic spread widens to Omit<R,'points'> & {points}, which TS can't see is R
    () => (data ? ({ ...data, points: filterByDte(data.points, minDte, maxDte) } as R) : undefined),
    [data, minDte, maxDte],
  );

  return { windowed, count: windowed?.points.length ?? 0 };
}
