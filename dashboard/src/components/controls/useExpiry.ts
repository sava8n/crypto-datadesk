import { useSettings } from '../../settings/store';
import { EXPIRY_ALL, resolveExpiry } from '../../utils/expiry';

/**
 * Resolves the global expiry setting against a section's quoted chain.
 *
 * 'weekly'/'monthly' follow the front expiry of that tenor as the chain rolls.
 * EXPIRY_ALL maps to the empty string ("every expiry") where the section supports
 * it and falls back to the front expiry where it does not. A concrete pick holds
 * only while it is still quoted; off the chain, the front expiry takes over.
 */
export function useExpiry(expiries: string[], { allowAll = false } = {}): string | null {
  const { expiry } = useSettings();

  if (expiry === EXPIRY_ALL && allowAll) return '';
  return resolveExpiry(expiry, expiries) ?? (allowAll ? '' : null);
}
