declare module 'react-markdown' {
  import { ComponentType, ReactNode } from 'react';

  export interface ReactMarkdownProps {
    children?: string;
    components?: {
      [nodeType: string]: ComponentType<Record<string, unknown>>;
    };
    remarkPlugins?: unknown[];
    rehypePlugins?: unknown[];
    className?: string;
    skipHtml?: boolean;
    unwrapDisallowed?: boolean;
    allowedElements?: string[];
    disallowedElements?: string[];
  }

  const ReactMarkdown: ComponentType<ReactMarkdownProps>;
  export default ReactMarkdown;
}
