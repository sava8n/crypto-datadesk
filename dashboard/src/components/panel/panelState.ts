export type PanelState<T> =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'sparse'; count: number }
  | { kind: 'ready'; data: T };

// structural match for react-query's result, so this module stays dependency-free
export interface QueryStatus {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Which of the four things a panel body shows.
 *
 * `value` is what the panel renders, which for most sections is a derived shape
 * (DTE-windowed, expiry-filtered) rather than the raw response. `count` is the
 * point count `min` applies to; thresholds differ per chart kind, see minPoints.ts.
 */
export function panelState<T>(
  query: QueryStatus,
  value: T | undefined,
  count: number,
  min: number,
): PanelState<T> {
  if (query.isLoading) return { kind: 'loading' };
  if (value === undefined) {
    if (query.isError) return { kind: 'error', message: query.error?.message ?? 'REQUEST FAILED' };
    return { kind: 'loading' };
  }
  if (count < min) return { kind: 'sparse', count };
  return { kind: 'ready', data: value };
}
