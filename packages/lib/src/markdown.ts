/**
 * DOM-free entry point for build scripts, server routes, and edge workers
 * that publish Markdown alongside an apiuikit UI.
 */
export { documentToLlmsTxt, documentToMarkdown, listDocumentTargets, targetSlug } from "./helpers/llmsTxt";
export type { DocumentTarget, LlmsTxtLink, LlmsTxtOptions } from "./helpers/llmsTxt";
export {
  asyncApiOperationToMarkdown,
  asyncApiToMarkdown,
  openApiEndpointToMarkdown,
  openApiToMarkdown,
} from "./helpers/toMarkdown";
export type { MarkdownTarget } from "./config/config";
