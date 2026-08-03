import { CALL, CALL_DEEP, PUT, PUT_DEEP } from '../../theme/charts';
import type { OIByExpiryPoint, OIByStrikePoint } from '../../types';

// four moneyness buckets, stacked calls-vs-puts
export const OI_SERIES = [
  { key: 'itm_calls', name: 'ITM Calls', color: CALL, stack: 'calls' },
  { key: 'otm_calls', name: 'OTM Calls', color: CALL_DEEP, stack: 'calls' },
  { key: 'itm_puts', name: 'ITM Puts', color: PUT, stack: 'puts' },
  { key: 'otm_puts', name: 'OTM Puts', color: PUT_DEEP, stack: 'puts' },
] as const satisfies readonly {
  key: keyof OIByStrikePoint & keyof OIByExpiryPoint;
  name: string;
  color: string;
  stack: string;
}[];

export const OI_SERIES_NAMES = OI_SERIES.map((s) => s.name);
