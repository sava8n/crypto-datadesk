export type PanelState<T> =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'sparse'; count: number }
  | { kind: 'empty'; message: string }
  | { kind: 'ready'; data: T };

// structural match for react-query's result, so this module stays dependency-free
export interface QueryStatus {
  isLoading: boolean;
  isError: boolean;
}

const FAILED = 'SOMETHING WENT WRONG';

/**
 * `value` is the derived shape the panel renders; `count` is what `min` applies to, see
 * minPoints.ts.
 */
export function panelState<T>(
  query: QueryStatus,
  value: T | undefined,
  count: number,
  min: number,
): PanelState<T> {
  if (query.isLoading) return { kind: 'loading' };
  if (value === undefined) {
    if (query.isError) return { kind: 'error', message: FAILED };
    return { kind: 'loading' };
  }
  if (count < min) return { kind: 'sparse', count };
  return { kind: 'ready', data: value };
}
