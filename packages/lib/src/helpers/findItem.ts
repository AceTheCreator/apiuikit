import { HTTP_METHODS, HttpMethod, OpenAPIPathItemData } from "../types/openapi";

/** How a single-endpoint section names its endpoint: by `operationId`, or by method + path. */
export type EndpointSelector = { operationId: string } | { method: HttpMethod; path: string };

export interface FoundEndpoint {
  method: HttpMethod;
  path: string;
  pathItem: OpenAPIPathItemData;
}

/**
 * Finds one endpoint in a `paths` (or `webhooks`) map. Method matching is
 * case-insensitive, since `"GET"` is what people tend to type and the map
 * keys are lowercase. Returns null when nothing matches.
 */
export function findEndpoint(
  paths: Record<string, OpenAPIPathItemData | undefined>,
  selector: EndpointSelector,
): FoundEndpoint | null {
  if ("operationId" in selector) {
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      const method = HTTP_METHODS.find((m) => pathItem[m]?.operationId === selector.operationId);
      if (method) return { method, path, pathItem };
    }
    return null;
  }

  const pathItem = paths[selector.path];
  const method = selector.method.toLowerCase() as HttpMethod;
  if (!pathItem?.[method]) return null;
  return { method, path: selector.path, pathItem };
}

/** A readable form of a selector, for "not found" warnings. */
export function describeEndpointSelector(selector: EndpointSelector): string {
  return "operationId" in selector
    ? `operationId "${selector.operationId}"`
    : `${selector.method.toUpperCase()} ${selector.path}`;
}
