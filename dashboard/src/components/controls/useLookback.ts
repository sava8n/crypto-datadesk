import { useState } from 'react';

import type { Resolution } from '../../types';

// preset lookback windows for the history panels
export const LOOKBACKS = [7, 30, 90, 365] as const;

export type LookbackDays = (typeof LOOKBACKS)[number];

export const DEFAULT_LOOKBACK: LookbackDays = 90;

// short lookbacks read the hourly captures; longer ones the last capture per day,
// keeping the payload bounded (90d at 1h would be ~2200 points per series)
export const resolutionFor = (days: number): Resolution => (days <= 14 ? '1h' : '1d');

// section-local lookback, mirroring how useDteWindow keeps panels independent
export function useLookback(initial: LookbackDays = DEFAULT_LOOKBACK) {
  const [days, setDays] = useState<LookbackDays>(initial);
  return { days, setDays, resolution: resolutionFor(days) };
}
