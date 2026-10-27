/**
 * DOM-free entry point for build scripts, server routes, and edge workers
 * that publish Markdown alongside an apiuikit UI.
 */
export { documentToLlmsTxt, documentToMarkdown, listDocumentTargets, targetSlug } from "./helpers/llmsTxt";
export type { DocumentTarget, LlmsTxtLink, LlmsTxtOptions } from "./helpers/llmsTxt";
export { markdownForLlm } from "./helpers/markdownForLlm";
export {
  asyncApiOperationToMarkdown,
  asyncApiToMarkdown,
  openApiEndpointToMarkdown,
  openApiToMarkdown,
} from "./helpers/toMarkdown";
// Arazzo exports from its resolved model: resolve the document and its
// sources with `resolveArazzoDocument` from "apiuikit" first. The resolver
// isn't re-exported here because it carries the optional YAML parsers, which
// would add megabytes to this otherwise small build.
export { arazzoToMarkdown, arazzoWorkflowToMarkdown } from "./helpers/arazzoToMarkdown";
export type { MarkdownTarget } from "./config/config";
