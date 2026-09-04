/**
 * Shared markdown renderer for every surface that shows model-written text.
 *
 * ChatbotApp and BuddyPanel each carried their own bare `<ReactMarkdown>`,
 * and the WordEditor preview a third — all relying on the surrounding
 * `prose-buddy` CSS alone. Element overrides here (strong, headings, lists,
 * code, tables, …) carry the important styling themselves, so bold, titles
 * and lists render correctly wherever this is used. Do not render model
 * output with a bare `{content}` / whitespace-pre-wrap; use this instead, or
 * raw `**bold**` and `# titles` leak through to the user.
 */

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  content: string;
  className?: string;
}

type MarkdownNode = { node?: unknown };
type ElementProps<T extends keyof React.JSX.IntrinsicElements> =
  React.ComponentPropsWithoutRef<T> & MarkdownNode;

function Markdown({ content, className }: MarkdownProps) {
  const components = useMemo(
    () => ({
      // `node` is the mdast node react-markdown hands every override — it must
      // never reach the DOM, so each override strips it (see the `a` below).
      a: ({ node: _node, href, children, ...props }: ElementProps<'a'>) => (
        <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
          {children}
        </a>
      ),
      strong: ({ node: _node, children, ...props }: ElementProps<'strong'>) => (
        <strong style={{ fontWeight: 650 }} {...props}>
          {children}
        </strong>
      ),
      h1: ({ node: _node, children, ...props }: ElementProps<'h1'>) => (
        <h1 style={{ fontSize: '1.3em' }} {...props}>
          {children}
        </h1>
      ),
      h2: ({ node: _node, children, ...props }: ElementProps<'h2'>) => (
        <h2 style={{ fontSize: '1.15em' }} {...props}>
          {children}
        </h2>
      ),
      h3: ({ node: _node, children, ...props }: ElementProps<'h3'>) => (
        <h3 style={{ fontSize: '1.03em' }} {...props}>
          {children}
        </h3>
      ),
      code: ({ node: _node, className: codeClass, children, ...props }: ElementProps<'code'>) => (
        <code className={codeClass} {...props}>
          {children}
        </code>
      ),
    }),
    [],
  );

  return (
    <div className={className ? `prose-buddy os-selectable ${className}` : 'prose-buddy os-selectable'}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
