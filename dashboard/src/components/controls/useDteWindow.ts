import { useMemo, useState } from 'react';

import { useSettings } from '../../settings/store';
import { filterByDte } from '../../utils/dte';

export interface DTEWindow {
  min: number;
  max: number;
}

// section-local DTE window, re-seeded from the settings default whenever that default moves
export function useDteWindow() {
  const { minDte, maxDte } = useSettings();
  const [dte, setDte] = useState<DTEWindow>({ min: minDte, max: maxDte });
  const [seed, setSeed] = useState({ minDte, maxDte });

  // the default moved, so drop the section-local override
  if (seed.minDte !== minDte || seed.maxDte !== maxDte) {
    setSeed({ minDte, maxDte });
    setDte({ min: minDte, max: maxDte });
  }

  return [dte, setDte] as const;
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
