import { C } from '../../theme/charts';
import type { OIByExpiryPoint, OIByStrikePoint } from '../../types';

interface OISeries {
  key: keyof OIByStrikePoint & keyof OIByExpiryPoint;
  name: string;
  color: string;
  stack: string;
}

// A factory, so the colours follow the theme.
export const oiSeries = (): OISeries[] => [
  { key: 'itm_calls', name: 'ITM Calls', color: C.callSoft, stack: 'calls' },
  { key: 'otm_calls', name: 'OTM Calls', color: C.call, stack: 'calls' },
  { key: 'itm_puts', name: 'ITM Puts', color: C.putSoft, stack: 'puts' },
  { key: 'otm_puts', name: 'OTM Puts', color: C.put, stack: 'puts' },
];

export const OI_SERIES_NAMES = ['ITM Calls', 'OTM Calls', 'ITM Puts', 'OTM Puts'];
