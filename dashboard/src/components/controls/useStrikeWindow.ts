import { useMemo } from 'react';

import { useChartScope } from '../../settings/store';
import { filterByMoneyness } from '../../utils/strikes';

export function useStrikeWindowed<R extends { points: { strike: number }[] }>(
  chartId: string,
  data: R | undefined,
  spot: number | null,
) {
  const { scope } = useChartScope(chartId);
  const { strikeRange } = scope;

  const windowed = useMemo(
    () =>
      data
        ? ({ ...data, points: filterByMoneyness(data.points, spot, strikeRange) } as R)
        : undefined,
    [data, spot, strikeRange],
  );

  return { windowed, count: windowed?.points.length ?? 0 };
}
