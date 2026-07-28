import React from "react";
import DOMPurify from "isomorphic-dompurify";

import { renderMarkdown } from "../helpers/marked";

const Markdown: React.FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  if (!children) {
    return null;
  }
  if (typeof children !== "string") {
    return <>{children}</>;
  }

  return (
    <div
      className="prose max-w-none text-foreground-muted prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary-600 prose-code:text-foreground-secondary prose-blockquote:text-foreground-muted prose-blockquote:border-border prose-thead:border-border prose-tr:border-border"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(renderMarkdown(children)),
      }}
    />
  );
};

export default Markdown;
