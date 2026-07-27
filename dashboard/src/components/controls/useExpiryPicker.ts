import { useState } from 'react';

import { useSettings } from '../../settings/store';
import { frontExpiry } from '../../utils/expiry';

/**
 * Which expiry a section is showing.
 *
 * It tracks the front expiry from settings, so the selection follows the
 * chain as it rolls. An explicit pick is held only while it is still quoted; when it
 * falls off the chain the front expiry takes over again.
 *
 * With `allowAll`, the empty string is a valid pick meaning "every expiration".
 */
export function useExpiryPicker(expiries: string[], { allowAll = false } = {}) {
  const { frontExpiry: pref } = useSettings();
  const [picked, setPicked] = useState<string | null>(null);

  const held = picked !== null && ((allowAll && picked === '') || expiries.includes(picked));
  const front = frontExpiry(expiries, pref) ?? (allowAll ? '' : null);

  return { selected: held ? picked : front, select: setPicked };
}
