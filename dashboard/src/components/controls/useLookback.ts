import type { Resolution } from '../../types';
import type { LookbackDays } from '../../config';
import { useSettings } from '../../settings/store';
import { useSeeded } from './useSeeded';

// short lookbacks read the hourly captures; longer ones the last capture per day,
// keeping the payload bounded (90d at 1h would be ~2200 points per series)
export const resolutionFor = (days: number): Resolution => (days <= 14 ? '1h' : '1d');

/**
 * Section-local lookback, seeded from the settings default.
 *
 * `initial` pins a panel that cannot use the shared default - the VRP panel needs a
 * year of archive before it can pair anything, so it opts out.
 */
export function useLookback(initial?: LookbackDays) {
  const { historyLookbackDays } = useSettings();
  const [days, setDays] = useSeeded<LookbackDays>(initial ?? historyLookbackDays);
  return { days, setDays, resolution: resolutionFor(days) };
}
