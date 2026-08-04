import type { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import type { SchemaNodeData } from "./schema";

// openapi-types' two major-version namespaces (3.0.x vs 3.1.x) diverge in a few
// spots (e.g. 3.1's JSON-Schema-aligned `type`/`examples`), but every field this
// library actually renders is shape-compatible across both — so components work
// against the union rather than branching on `openapi` version at every call site.
export type OpenAPIInfoData = OpenAPIV3.InfoObject | OpenAPIV3_1.InfoObject;
export type OpenAPIServerData = OpenAPIV3.ServerObject | OpenAPIV3_1.ServerObject;
export type OpenAPIServerVariableData = OpenAPIV3.ServerVariableObject | OpenAPIV3_1.ServerVariableObject;
export type OpenAPIParameterData = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
export type OpenAPIRequestBodyData = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
export type OpenAPIResponseData = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
export type OpenAPIMediaTypeData = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;
export type OpenAPIHeaderData = OpenAPIV3.HeaderObject | OpenAPIV3_1.HeaderObject;
export type OpenAPILinkData = OpenAPIV3.LinkObject | OpenAPIV3_1.LinkObject;
export type OpenAPISecuritySchemeData = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;
export type OpenAPITagData = OpenAPIV3.TagObject | OpenAPIV3_1.TagObject;
export type OpenAPIExternalDocsData = OpenAPIV3.ExternalDocumentationObject | OpenAPIV3_1.ExternalDocumentationObject;

export const HTTP_METHODS = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface OpenAPIOperationData extends Record<string, unknown> {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenAPIParameterData[];
  requestBody?: OpenAPIRequestBodyData;
  responses?: Record<string, OpenAPIResponseData>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
  externalDocs?: OpenAPIExternalDocsData;
  /**
   * Out-of-band requests the API sends *to the caller* after this operation.
   * Keyed by callback name, then by a URL-template expression naming where the
   * request goes, whose value is a Path Item Object like any other.
   */
  callbacks?: Record<string, OpenAPICallbackData>;
}

/** One callback's URL-expression map. Each value is a Path Item Object, so it renders like any other operation. */
export type OpenAPICallbackData = Record<string, OpenAPIPathItemData>;

export type OpenAPIPathItemData = Partial<Record<HttpMethod, OpenAPIOperationData>> & {
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameterData[];
};

export interface FlatEndpoint {
  key: string;
  method: HttpMethod;
  path: string;
}

export const endpointKey = (method: string, path: string) => `${method} ${path}`;

/**
 * Parameters shared across every method on a path can be declared once on
 * the PathItem instead of repeated per operation (e.g. a `{userId}` path
 * param declared on `/users/{userId}` itself) — merge those in, with the
 * operation's own parameters overriding a path-item one of the same name+in.
 */
export function resolveOperationParameters(
  pathItem: OpenAPIPathItemData | undefined,
  operation: OpenAPIOperationData | null | undefined,
): OpenAPIParameterData[] {
  const merged = new Map<string, OpenAPIParameterData>();
  for (const param of pathItem?.parameters ?? []) merged.set(`${param.in}:${param.name}`, param);
  for (const param of operation?.parameters ?? []) merged.set(`${param.in}:${param.name}`, param);
  return Array.from(merged.values());
}

/** Flattens `paths` (each holding multiple HTTP methods) into one row per operation, sorted by path. Shared by Paths.tsx (the Endpoints list) and OpenAPINavigation.tsx (the sidebar), which otherwise duplicated this walk. */
export function flattenEndpoints(paths: Record<string, OpenAPIPathItemData | undefined>): FlatEndpoint[] {
  return Object.keys(paths)
    .sort()
    .flatMap((path) => {
      const pathItem = paths[path];
      if (!pathItem) return [];
      return HTTP_METHODS.filter((method) => pathItem[method]).map((method) => ({
        key: endpointKey(method, path),
        method,
        path,
      }));
    });
}

/**
 * Internal document model produced by both entry points (mirrors
 * AsyncAPIDocumentData). Both the no-parser path and `@scalar/openapi-parser`
 * output are normalized through `resolveDocument`, so downstream components
 * always deal with one shape: a plain acyclic object tree where cycle points
 * are `$ref` nodes resolved lazily via the context's `deref` (see
 * resolveDocument's contract).
 */
export interface OpenAPIDocumentData extends Record<string, unknown> {
  openapi: string;
  info: OpenAPIInfoData;
  servers?: OpenAPIServerData[];
  paths?: Record<string, OpenAPIPathItemData | undefined>;
  /**
   * OpenAPI 3.1's top-level `webhooks`: operations the API sends *out* rather
   * than ones a client calls. Each value is a Path Item Object exactly like
   * `paths`', keyed by an event name instead of a URL path, so both render
   * through the same components.
   */
  webhooks?: Record<string, OpenAPIPathItemData | undefined>;
  components?: {
    schemas?: Record<string, SchemaNodeData>;
    securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
    [key: string]: unknown;
  };
  security?: Array<Record<string, string[]>>;
  tags?: OpenAPITagData[];
  externalDocs?: OpenAPIExternalDocsData;
}
