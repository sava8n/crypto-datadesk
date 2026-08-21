/**
 * Deep equality for chart options. Functions compare equal (formatters are rebuilt on every
 * build, the values they render sit beside them); NaN equals NaN (the surface mesh uses it for
 * empty cells).
 */
export function sameOption(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'function' && typeof b === 'function') return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((v, i) => sameOption(v, b[i]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((k) => k in right && sameOption(left[k], right[k]));
}
