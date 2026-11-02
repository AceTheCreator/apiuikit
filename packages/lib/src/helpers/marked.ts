import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";

import "highlight.js/styles/night-owl.css";

import hljs from "highlight.js/lib/core";

import json from "highlight.js/lib/languages/json";

hljs.registerLanguage("json", json);

import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("yaml", yaml);

import bash from "highlight.js/lib/languages/bash";

hljs.registerLanguage("bash", bash);

import javascript from "highlight.js/lib/languages/javascript";

hljs.registerLanguage("javascript", javascript);

import python from "highlight.js/lib/languages/python";

hljs.registerLanguage("python", python);

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Relative URLs, fragments, and these schemes only. Anything else
// (`javascript:`, `data:`, `vbscript:`...) is dropped and the link renders as
// plain text. DOMPurify would strip such an href anyway; doing it here keeps
// server-rendered output safe where DOMPurify can't run.
const SAFE_URL_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

function safeHref(href: string): string | null {
  // Browsers ignore whitespace and control characters inside a scheme, so
  // `java\tscript:` still runs: strip them before reading it.
  // eslint-disable-next-line no-control-regex
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href.replace(/[\u0000-\u0020]/g, ""));
  return !scheme || SAFE_URL_SCHEMES.has(scheme[1].toLowerCase()) ? href : null;
}

function createMarked({ rawHtml }: { rawHtml: "keep" | "text" }) {
  const instance = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, language) {
        if (!hljs.getLanguage(language)) {
          return code;
        }
        try {
          return hljs.highlight(code, { language }).value;
        } catch {
          return code;
        }
      },
    })
  );

  instance.use({
    extensions: [
      {
        name: "link",
        renderer(token) {
          const text = this.parser.parseInline(token.tokens ?? []);
          const href = safeHref(token.href);
          if (href === null) {
            return text;
          }
          return `<a class="hover:underline hover:text-secondary-600" href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${text}</a>`;
        },
      },
    ],
  });

  if (rawHtml === "text") {
    instance.use({
      renderer: {
        // Keep the words of any raw HTML in the source, but not its tags.
        // Escaping the result is what makes this safe, not the tag regex.
        html({ text }) {
          return escapeHtml(text.replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, "").replace(/<[^>]*>/g, ""));
        },
      },
    });
  }

  return instance;
}

const marked = createMarked({ rawHtml: "keep" });
const serverSafeMarked = createMarked({ rawHtml: "text" });

/**
 * Renders Markdown to HTML.
 *
 * By default raw HTML in the source is passed through, so the result must go
 * through DOMPurify before it reaches the page. With `serverSafe`, raw HTML
 * is reduced to its escaped text, so the output is safe to inject as is. That
 * is what server rendering uses, since DOMPurify can't run without a DOM.
 */
export function renderMarkdown(content: string, { serverSafe = false }: { serverSafe?: boolean } = {}): string {
  // No async extensions are registered above, so `parse` always resolves synchronously.
  return (serverSafe ? serverSafeMarked : marked).parse(content) as string;
}

export { hljs };
