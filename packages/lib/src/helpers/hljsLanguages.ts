import { hljs } from "./marked";

/** Maps @readme/httpsnippet target keys to highlight.js grammar names.
 * Targets without a real programming-language grammar (agent's plain-text AI
 * prompt) fall back to "plaintext", which highlight.js's core renders without
 * a registered language. */
const TARGET_HLJS_LANGUAGE: Record<string, string> = {
  agent: "plaintext",
  c: "c",
  clojure: "clojure",
  crystal: "crystal",
  csharp: "csharp",
  go: "go",
  http: "http",
  java: "java",
  javascript: "javascript",
  json: "json",
  kotlin: "kotlin",
  node: "javascript",
  objc: "objectivec",
  ocaml: "ocaml",
  php: "php",
  powershell: "powershell",
  python: "python",
  r: "r",
  ruby: "ruby",
  rust: "rust",
  shell: "bash",
  swift: "swift",
};

export function hljsLanguageForTarget(target: string): string {
  return TARGET_HLJS_LANGUAGE[target] ?? "plaintext";
}

// json/yaml/bash/javascript/python are already eagerly registered in
// marked.ts (used by Markdown code fences and the curl/JS/Python defaults).
// The remaining grammars are loaded on demand so picking an exotic language
// from the code-samples dropdown doesn't cost every reader ~16 grammars
// up front that most will never select.
const LAZY_HLJS_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  c: () => import("highlight.js/lib/languages/c"),
  clojure: () => import("highlight.js/lib/languages/clojure"),
  crystal: () => import("highlight.js/lib/languages/crystal"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  go: () => import("highlight.js/lib/languages/go"),
  http: () => import("highlight.js/lib/languages/http"),
  java: () => import("highlight.js/lib/languages/java"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  objectivec: () => import("highlight.js/lib/languages/objectivec"),
  ocaml: () => import("highlight.js/lib/languages/ocaml"),
  php: () => import("highlight.js/lib/languages/php"),
  powershell: () => import("highlight.js/lib/languages/powershell"),
  r: () => import("highlight.js/lib/languages/r"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  rust: () => import("highlight.js/lib/languages/rust"),
  swift: () => import("highlight.js/lib/languages/swift"),
};

export function isHljsLanguageReady(hljsName: string): boolean {
  return hljsName === "plaintext" || Boolean(hljs.getLanguage(hljsName));
}

/** Registers a highlight.js grammar on first use. No-op if already
 * registered, if it's "plaintext" (needs no registration), or if there's no
 * loader for it (CodeBlock falls back to unhighlighted text in that case). */
export async function ensureHljsLanguage(hljsName: string): Promise<void> {
  if (isHljsLanguageReady(hljsName)) return;
  const loader = LAZY_HLJS_LOADERS[hljsName];
  if (!loader) return;
  const mod = await loader();
  hljs.registerLanguage(hljsName, mod.default as Parameters<typeof hljs.registerLanguage>[1]);
}
