// split text around [n]; ids without a reference still split, the model emits more markers
// than references
export function splitMarkers(text: string): (string | number)[] {
  const parts: (string | number)[] = [];
  let last = 0;
  for (const match of text.matchAll(/\[(\d+)\]/g)) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(Number(match[1]));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// drop ids with no reference, eating the leading whitespace so "claim [20]." -> "claim."
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

// collapse adjacent ids so "[1][3][5]" renders as "1,3,5", not "135"
export function groupMarkers(parts: (string | number)[]): (string | number[])[] {
  const grouped: (string | number[])[] = [];
  for (const part of parts) {
    const prev = grouped[grouped.length - 1];
    if (typeof part === 'number' && Array.isArray(prev)) prev.push(part);
    else grouped.push(typeof part === 'number' ? [part] : part);
  }
  return grouped;
}
