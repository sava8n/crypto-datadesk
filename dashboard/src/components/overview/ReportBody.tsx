import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { dropUnknownMarkers, groupMarkers, splitMarkers } from './markers';

// the restricted subset the prompt allows the model; anything else is unwrapped to text
const ALLOWED = [
  'h2',
  'h3',
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
];

function renderString(text: string, known: ReadonlySet<number>): ReactNode {
  const parts = groupMarkers(dropUnknownMarkers(splitMarkers(text), known));
  return parts.map((part, i) =>
    Array.isArray(part) ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: fragments of one immutable string, never reordered
      <sup key={i} className="ref-mark">
        {part.join(',')}
      </sup>
    ) : (
      part
    ),
  );
}

// swap [n] markers for superscripts in the text children of a rendered element
function withMarkers(children: ReactNode, known: ReadonlySet<number>): ReactNode {
  if (typeof children === 'string') return renderString(children, known);
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string' ? (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional children of one rendered markdown node
        <span key={i}>{renderString(child, known)}</span>
      ) : (
        child
      ),
    );
  }
  return children;
}

// markers appear only where text lives; container elements pass through untouched
function makeComponents(known: ReadonlySet<number>): Components {
  return {
    p: ({ node: _n, children, ...rest }) => <p {...rest}>{withMarkers(children, known)}</p>,
    li: ({ node: _n, children, ...rest }) => <li {...rest}>{withMarkers(children, known)}</li>,
    th: ({ node: _n, children, ...rest }) => <th {...rest}>{withMarkers(children, known)}</th>,
    td: ({ node: _n, children, ...rest }) => <td {...rest}>{withMarkers(children, known)}</td>,
    strong: ({ node: _n, children, ...rest }) => (
      <strong {...rest}>{withMarkers(children, known)}</strong>
    ),
    em: ({ node: _n, children, ...rest }) => <em {...rest}>{withMarkers(children, known)}</em>,
    img: ({ node: _n, alt, ...rest }) => (
      <img
        {...rest}
        alt={alt ?? ''}
        className="report-body__img"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    ),
  };
}

export default function ReportBody({
  body_md,
  refIds,
}: {
  body_md: string;
  refIds: ReadonlySet<number>;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      allowedElements={ALLOWED}
      unwrapDisallowed
      components={makeComponents(refIds)}
    >
      {body_md}
    </ReactMarkdown>
  );
}
