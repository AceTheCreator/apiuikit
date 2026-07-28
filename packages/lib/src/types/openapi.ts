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
}

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
 * AsyncAPIDocumentData): the no-parser path resolves $refs via
 * `resolveDocument`, the with-parser path gets a fully dereferenced object
 * back from `@scalar/openapi-parser`. Either way, downstream components only
 * ever deal with this plain-object shape.
 */
export interface OpenAPIDocumentData extends Record<string, unknown> {
  openapi: string;
  info: OpenAPIInfoData;
  servers?: OpenAPIServerData[];
  paths?: Record<string, OpenAPIPathItemData | undefined>;
  components?: {
    schemas?: Record<string, SchemaNodeData>;
    securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
    [key: string]: unknown;
  };
  security?: Array<Record<string, string[]>>;
  tags?: OpenAPITagData[];
  externalDocs?: OpenAPIExternalDocsData;
}
