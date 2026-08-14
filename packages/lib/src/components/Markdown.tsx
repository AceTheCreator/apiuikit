import React from "react";
import DOMPurify from "isomorphic-dompurify";

import { renderMarkdown } from "../helpers/marked";

// Tailwind Typography's default prose palette is designed for a light page
// and sets colors on descendants through its own --tw-prose-* variables.
// Point every prose role at our semantic theme tokens so Markdown follows the
// configured mode instead of retaining low-contrast light-theme colors.
const proseTheme = {
  "--tw-prose-body": "rgb(var(--color-text-secondary) / 1)",
  "--tw-prose-headings": "rgb(var(--color-text-primary) / 1)",
  "--tw-prose-lead": "rgb(var(--color-text-secondary) / 1)",
  "--tw-prose-links": "rgb(var(--color-primary-600) / 1)",
  "--tw-prose-bold": "rgb(var(--color-text-primary) / 1)",
  "--tw-prose-counters": "rgb(var(--color-text-muted) / 1)",
  "--tw-prose-bullets": "rgb(var(--color-text-muted) / 1)",
  "--tw-prose-hr": "rgb(var(--color-border) / 1)",
  "--tw-prose-quotes": "rgb(var(--color-text-secondary) / 1)",
  "--tw-prose-quote-borders": "rgb(var(--color-border) / 1)",
  "--tw-prose-captions": "rgb(var(--color-text-muted) / 1)",
  "--tw-prose-kbd": "rgb(var(--color-text-primary) / 1)",
  "--tw-prose-code": "rgb(var(--color-text-secondary) / 1)",
  "--tw-prose-th-borders": "rgb(var(--color-border) / 1)",
  "--tw-prose-td-borders": "rgb(var(--color-border) / 1)",
} as React.CSSProperties;

const Markdown: React.FunctionComponent<{
  children: React.ReactNode;
  /** Extra classes merged onto the root `.prose` div — e.g. `prose-sm` to shrink it for a compact context. */
  className?: string;
}> = ({ children, className = "" }) => {
  if (!children) {
    return null;
  }
  if (typeof children !== "string") {
    return <>{children}</>;
  }

  return (
    <div
      className={`prose max-w-none prose-code:before:content-none prose-code:after:content-none ${className}`}
      style={proseTheme}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(renderMarkdown(children)),
      }}
    />
  );
};

export default Markdown;
