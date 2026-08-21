import type { FlowEnvelope } from '../../types';
import { dateLabel } from '../../utils/format';

export function coverageSuffix(data?: Pick<FlowEnvelope, 'start' | 'tape_start'>): string {
  if (!data?.tape_start) return '';
  if (Date.parse(data.tape_start) <= Date.parse(data.start)) return '';
  return ` · DATA FROM ${dateLabel(data.tape_start)}`;
}
