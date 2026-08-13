/**
 * Wraps a whole-document Markdown export with agent instructions for "Copy
 * for LLM" and in-browser "View as Markdown". Build-time `documentToMarkdown`
 * stays plain unless you call this yourself.
 */

const AGENT_INSTRUCTIONS = [
  "The following is API documentation in Markdown.",
  "Use it to answer questions about this API and help write client code.",
  "Stick to what is documented below - do not invent endpoints, fields, or behavior.",
];

/** Prepends a fixed agent-instructions block to serialized Markdown. */
export function markdownForLlm(markdown: string): string {
  const block = ["> ## Agent Instructions", ...AGENT_INSTRUCTIONS.map((line) => `> ${line}`)].join("\n");
  return `${block}\n\n${markdown.trimStart()}`;
}
