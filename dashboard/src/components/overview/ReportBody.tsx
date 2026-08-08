import { type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { splitMarkers } from './markers';

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

function renderString(text: string): ReactNode {
  return splitMarkers(text).map((part, i) =>
    typeof part === 'number' ? (
      <sup key={i} className="ref-mark">
        {part}
      </sup>
    ) : (
      part
    ),
  );
}

// swap [n] markers for superscripts in the text children of a rendered element
function withMarkers(children: ReactNode): ReactNode {
  if (typeof children === 'string') return renderString(children);
  if (Array.isArray(children)) {
    return children.map((child, i) =>
      typeof child === 'string' ? <span key={i}>{renderString(child)}</span> : child,
    );
  }
  return children;
}

// markers appear only where text lives; container elements pass through untouched
const components: Components = {
  p: ({ node: _n, children, ...rest }) => <p {...rest}>{withMarkers(children)}</p>,
  li: ({ node: _n, children, ...rest }) => <li {...rest}>{withMarkers(children)}</li>,
  th: ({ node: _n, children, ...rest }) => <th {...rest}>{withMarkers(children)}</th>,
  td: ({ node: _n, children, ...rest }) => <td {...rest}>{withMarkers(children)}</td>,
  strong: ({ node: _n, children, ...rest }) => <strong {...rest}>{withMarkers(children)}</strong>,
  em: ({ node: _n, children, ...rest }) => <em {...rest}>{withMarkers(children)}</em>,
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

export default function ReportBody({ body_md }: { body_md: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      allowedElements={ALLOWED}
      unwrapDisallowed
      components={components}
    >
      {body_md}
    </ReactMarkdown>
  );
}
