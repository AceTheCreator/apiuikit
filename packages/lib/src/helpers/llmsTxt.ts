/**
 * Spec-agnostic document helpers for publishing an AI-discoverable docs site:
 * list what's linkable, serialize any of it to Markdown, and build the
 * `llms.txt` index that ties them together.
 *
 * These are the build-time counterpart to `config.markdown.url`: that option
 * says where a document's Markdown lives, and these produce what's served
 * there. All three dispatch through the spec adapters, so they work for every
 * spec the library supports without the caller branching on which one it has.
 */
import type { MarkdownTarget } from "../config/config";
import { adapterFor, type DocumentTarget } from "./specAdapters";

export type { DocumentTarget };

export interface LlmsTxtLink {
  label: string;
  url: string;
  description?: string;
}

export interface LlmsTxtOptions {
  /**
   * Absolute base URL of the docs site, e.g. `"https://docs.acme.com"`. Used
   * to build a default URL per entry; ignore it entirely by passing `url`.
   */
  baseUrl?: string;
  /**
   * The URL serving an entry as Markdown. Return `null` to leave an entry out
   * of the index. Defaults to `${baseUrl}/${slug}.md`, which is a guess at
   * your routes: pass this whenever they differ, which is most of the time.
   */
  url?: (entry: DocumentTarget) => string | null | undefined;
  /** Overrides the document's own `info.title`. */
  title?: string;
  /** Overrides the document's own `info.description`. */
  summary?: string;
  /**
   * Extra links for the trailing "Optional" section: the source spec, a
   * changelog, a support page. Serving the raw spec here (e.g.
   * `https://docs.acme.com/openapi.yaml`) is worth doing, since an agent can
   * consume it directly instead of reading prose.
   */
  optional?: LlmsTxtLink[];
}

/** URL-safe slug from a target key: `"get /pets/{petId}"` to `"get-pets-petid"`. */
export function targetSlug(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Every linkable item in a document: OpenAPI endpoints, AsyncAPI operations.
 * Each carries the `target` to hand `documentToMarkdown`, so generating a file
 * per entry is a loop over this list.
 */
export function listDocumentTargets(document: unknown): DocumentTarget[] {
  const adapter = adapterFor(document);
  return adapter.targets(document);
}

/**
 * Serializes a document to Markdown. Pass a `target` from
 * `listDocumentTargets` for a single endpoint/operation, or omit it for the
 * whole document.
 */
export function documentToMarkdown(document: unknown, target?: MarkdownTarget): string {
  const adapter = adapterFor(document);
  if (target && target.document !== document) {
    throw new Error("[apiuikit] Markdown target belongs to a different document.");
  }
  return adapter.toMarkdown(document, target);
}

/**
 * Builds an `llms.txt` index for a document, in the llmstxt.org format: an H1
 * name, a blockquote summary, then one described link per endpoint/operation.
 */
export function documentToLlmsTxt(document: unknown, options: LlmsTxtOptions = {}): string {
  const adapter = adapterFor(document);
  const { baseUrl, url, optional } = options;

  const base = baseUrl?.replace(/\/+$/, "") ?? "";
  const defaultUrl = (entry: DocumentTarget) => `${base}/${targetSlug(entry.key)}.md`;
  const resolve = url ?? defaultUrl;

  const lines = [`# ${options.title ?? adapter.title(document)}`];

  const summary = options.summary ?? adapter.summary(document);
  if (summary) lines.push("", `> ${summary}`);

  const entries = adapter
    .targets(document)
    .map((entry) => ({ entry, href: resolve(entry) }))
    .filter((row): row is { entry: DocumentTarget; href: string } => Boolean(row.href));

  if (entries.length) {
    lines.push("", `## ${adapter.sectionTitle}`, "");
    for (const { entry, href } of entries) {
      lines.push(`- [${entry.label}](${href})${entry.summary ? `: ${entry.summary}` : ""}`);
    }
  }

  if (optional?.length) {
    lines.push("", "## Optional", "");
    for (const link of optional) {
      lines.push(`- [${link.label}](${link.url})${link.description ? `: ${link.description}` : ""}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
