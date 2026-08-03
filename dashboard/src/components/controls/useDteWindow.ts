import { useMemo } from 'react';

import { useSettings } from '../../settings/store';
import { filterByDte } from '../../utils/dte';
import { useSeeded } from './useSeeded';

export interface DTEWindow {
  min: number;
  max: number;
}

// section-local DTE window, re-seeded from the settings default whenever that default moves
export function useDteWindow() {
  const { minDte, maxDte } = useSettings();
  // useSeeded reseeds on identity, so the pair has to be one stable reference
  const seed = useMemo(() => ({ min: minDte, max: maxDte }), [minDte, maxDte]);
  return useSeeded<DTEWindow>(seed);
}

/**
 * A response with its points windowed by the section's own DTE range.
 *
 * Each section keeps an independent window on purpose - sharing one would couple
 * every volatility panel to whichever was adjusted last.
 */
export function useDteWindowed<R extends { points: { tte_years: number }[] }>(data: R | undefined) {
  const [dte, setDte] = useDteWindow();

  const windowed = useMemo(
    // the generic spread widens to Omit<R,'points'> & {points}, which TS can't see is R
    () => (data ? ({ ...data, points: filterByDte(data.points, dte.min, dte.max) } as R) : undefined),
    [data, dte],
  );

  return {
    windowed,
    count: windowed?.points.length ?? 0,
    dteProps: {
      min: dte.min,
      max: dte.max,
      onChange: (min: number, max: number) => setDte({ min, max }),
    },
  };
}
