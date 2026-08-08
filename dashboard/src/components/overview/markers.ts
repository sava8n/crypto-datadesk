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
