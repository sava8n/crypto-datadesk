import type { FlowEnvelope } from '../../types';
import { expiryLabel } from '../../utils/format';

// subtitle suffix when the tape is shallower than the requested window
export function coverageSuffix(data?: Pick<FlowEnvelope, 'start' | 'tape_start'>): string {
  if (!data?.tape_start) return '';
  if (Date.parse(data.tape_start) <= Date.parse(data.start)) return '';
  return ` · DATA FROM ${expiryLabel(data.tape_start)}`;
}
