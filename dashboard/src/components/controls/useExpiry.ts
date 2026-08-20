import { useChartScope } from '../../settings/store';
import { EXPIRY_ALL, resolveExpiry } from '../../utils/expiry';

/**
 * Resolves one chart's expiry scope against the chain it quotes.
 *
 * EXPIRY_ALL maps to the empty string ("every expiry") where the section supports it and
 * falls back to the front expiry where it does not. A concrete pick holds only while it is
 * still quoted; off the chain, the front expiry of its tenor takes over.
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
