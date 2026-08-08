// Citation markers: the report body carries bare "[n]" after the claims they back.

// Split text around [n] markers; numbers in the result are marker ids. Ids without a
// matching reference still split - the model sometimes emits more markers than
// references.
export function splitMarkers(text: string): (string | number)[] {
  const marker = /\[(\d+)\]/g;
  const parts: (string | number)[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(Number(match[1]));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// Drop marker ids with no matching reference, also eating the whitespace that led into
// them so "claim [20]." collapses to "claim." rather than "claim .".
export function dropUnknownMarkers(
  parts: (string | number)[],
  known: ReadonlySet<number>,
): (string | number)[] {
  const kept: (string | number)[] = [];
  for (const part of parts) {
    if (typeof part === 'number' && !known.has(part)) {
      const prev = kept[kept.length - 1];
      if (typeof prev === 'string') {
        const trimmed = prev.replace(/\s+$/, '');
        if (trimmed) kept[kept.length - 1] = trimmed;
        else kept.pop();
      }
      continue;
    }
    kept.push(part);
  }
  return kept;
}

// Collapse runs of adjacent ids into one group so "[1][3][5]" renders as a single
// "1,3,5" superscript instead of a run that reads like "135".
export function groupMarkers(parts: (string | number)[]): (string | number[])[] {
  const grouped: (string | number[])[] = [];
  for (const part of parts) {
    const prev = grouped[grouped.length - 1];
    if (typeof part === 'number' && Array.isArray(prev)) prev.push(part);
    else grouped.push(typeof part === 'number' ? [part] : part);
  }
  return grouped;
}
