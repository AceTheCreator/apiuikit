import React from "react";
import DOMPurify from "isomorphic-dompurify";

import { renderMarkdown } from "../helpers/marked";

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
      className={`prose max-w-none text-foreground-muted prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary-600 prose-code:text-foreground-secondary prose-code:before:content-none prose-code:after:content-none prose-blockquote:text-foreground-muted prose-blockquote:border-border ${className}`}
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(renderMarkdown(children)),
      }}
    />
  );
};

export default Markdown;
