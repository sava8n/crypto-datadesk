import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { sameOption } from './sameOption';

/**
 * An option equal to the one on screen is dropped, so echarts gets the same reference and skips
 * the update. Options arriving during a hold are not queued; the last one lands on release.
 * `animation` is on for the first paint only: the wrappers replace series and axes, so echarts
 * would replay the entry animation on every update.
 */
export function useChartOption<T extends object>(option: T) {
  const [held, setHeld] = useState(false);
  const [shown, setShown] = useState(option);
  const mounted = useRef(false);

  // an effect rather than a render-phase write, so a StrictMode double render still animates
  useEffect(() => {
    mounted.current = true;
  }, []);

  useEffect(() => {
    if (!held) setShown((prev) => (sameOption(prev, option) ? prev : option));
  }, [option, held]);

  return {
    option: useMemo(() => ({ ...shown, animation: !mounted.current }), [shown]),
    hold: useCallback(() => setHeld(true), []),
    release: useCallback(() => setHeld(false), []),
  };
}
