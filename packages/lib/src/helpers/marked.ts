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

const marked = new Marked(
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

marked.use({
  extensions: [
    {
      name: "link",
      renderer(token) {
        return `<a class="hover:underline hover:text-secondary-600" href="${token.href}" rel="noopener noreferrer" target="_blank">${token.text}</a>`;
      },
    },
  ],
});

export function renderMarkdown(content: string): string {
  // No async extensions are registered above, so `parse` always resolves synchronously.
  return marked.parse(content) as string;
}

export { hljs };
