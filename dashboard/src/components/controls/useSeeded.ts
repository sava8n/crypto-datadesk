import { useState } from 'react';

/**
 * Section-local state seeded from a settings default.
 *
 * The override survives refetches and tab switches within a mount, but is dropped
 * whenever the default itself moves - so changing a setting reaches every panel that
 * has not been deliberately overridden since.
 */
export function useSeeded<T>(seed: T) {
  const [value, setValue] = useState(seed);
  const [prev, setPrev] = useState(seed);

  if (prev !== seed) {
    setPrev(seed);
    setValue(seed);
  }

  return [value, setValue] as const;
}
