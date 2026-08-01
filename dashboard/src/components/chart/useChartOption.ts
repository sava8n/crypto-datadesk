import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { sameOption } from './sameOption';

/**
 * The option a chart should render.
 *
 * An option equivalent to the one on screen is dropped rather than shown, so the wrapper
 * hands echarts the same reference and it skips the update: a poll that brings back the
 * same market redraws nothing. Options arriving during a hold are not queued - the last
 * one lands when the hold lifts.
 *
 * `animation` is on for the first paint only. The wrappers replace the series and axes, so
 * echarts reads every later update as an insert and would replay the entry animation.
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
