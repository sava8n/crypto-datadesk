import { useChartScope } from '../../settings/store';
import { EXPIRY_ALL, resolveExpiry } from '../../utils/expiry';

/**
 * EXPIRY_ALL resolves to '' (every expiry) where the section supports it, else to the front
 * expiry. A concrete pick holds while quoted; off the chain, the front expiry of its tenor.
 */
export function useExpiry(
  chartId: string,
  expiries: string[],
  { allowAll = false } = {},
): string | null {
  const { scope } = useChartScope(chartId);

  if (scope.expiry === EXPIRY_ALL && allowAll) return '';
  return resolveExpiry(scope.expiry, expiries) ?? (allowAll ? '' : null);
}
