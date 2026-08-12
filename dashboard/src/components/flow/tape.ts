// Tape presentation helpers, kept pure for testing.

import type { TapePrint } from '../../types';
import { dateLabel, strikeFmt } from '../../utils/format';

// "07AUG26 64k C"
export function instrumentLabel(print: TapePrint): string {
  return `${dateLabel(print.expiry)} ${strikeFmt(print.strike)} ${print.option_type}`;
}

export function tags(print: TapePrint): string {
  const parts = [];
  if (print.block_trade_id != null) parts.push('BLOCK');
  if (print.liquidation != null) parts.push('LIQ');
  return parts.join(' ');
}

export const MIN_PREMIUMS = [
  { value: 0, label: 'ALL' },
  { value: 10_000, label: '≥$10K' },
  { value: 100_000, label: '≥$100K' },
  { value: 1_000_000, label: '≥$1M' },
] as const;
