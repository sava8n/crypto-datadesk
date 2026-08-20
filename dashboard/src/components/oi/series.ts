import { colors } from '../../theme/charts';
import type { OIByExpiryPoint, OIByStrikePoint } from '../../types';

interface OISeries {
  key: keyof OIByStrikePoint & keyof OIByExpiryPoint;
  name: string;
  color: string;
  stack: string;
}

// a factory so the colours follow the theme
export const oiSeries = (): OISeries[] => [
  { key: 'itm_calls', name: 'ITM Calls', color: colors.callSoft, stack: 'calls' },
  { key: 'otm_calls', name: 'OTM Calls', color: colors.call, stack: 'calls' },
  { key: 'itm_puts', name: 'ITM Puts', color: colors.putSoft, stack: 'puts' },
  { key: 'otm_puts', name: 'OTM Puts', color: colors.put, stack: 'puts' },
];

export const OI_SERIES_NAMES = ['ITM Calls', 'OTM Calls', 'ITM Puts', 'OTM Puts'];
