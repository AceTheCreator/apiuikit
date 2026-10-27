import type { ArazzoParseResult, ArazzoResolveOptions } from "../types/arazzo";

// The model builder (validation, source resolution, linking) loads on first
// use, so pages that never show Arazzo don't carry it in the main bundle.
const loadResolver = () => import("./arazzoResolver");

/**
 * Resolves an Arazzo document that is already a JavaScript object: validates
 * it, loads its sources (see `ArazzoResolveOptions` for where they come from),
 * links every step to the operation or workflow it calls, and parses its
 * runtime expressions. Doesn't need `@usearazzo/parser`.
 */
export async function resolveArazzoDocument(
  document: Record<string, unknown>,
  options: ArazzoResolveOptions = {},
): Promise<ArazzoParseResult> {
  return (await loadResolver()).resolveArazzoDocument(document, options);
}

/**
 * Parses Arazzo YAML or JSON text, then resolves it like
 * `resolveArazzoDocument`. Needs `@usearazzo/parser` installed; without it
 * the result is `unrenderable`, with a diagnostic saying so.
 */
export async function parseArazzoDocument(raw: string, options: ArazzoResolveOptions = {}): Promise<ArazzoParseResult> {
  return (await loadResolver()).parseArazzoDocument(raw, options);
}
