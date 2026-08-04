import { HTTPSnippet, availableTargets, type HarRequest } from "@readme/httpsnippet";
import {
  HttpMethod,
  OpenAPIParameterData,
  OpenAPIRequestBodyData,
  OpenAPISecuritySchemeData,
  OpenAPIServerData,
} from "../types/openapi";

export const DEFAULT_CODE_SAMPLE_TARGET = "shell";
export const DEFAULT_CODE_SAMPLE_CLIENT = "curl";

export type AvailableCodeSampleTarget = ReturnType<typeof availableTargets>[number];

/** Every target/client @readme/httpsnippet knows how to generate (curl,
 * fetch, axios, Python requests, Go, Rust, ...), grouped by target — this is
 * the data source for the language/library dropdown. Pure passthrough kept
 * here so `@readme/httpsnippet` stays imported in one place. */
export function getAvailableCodeSampleTargets(): AvailableCodeSampleTarget[] {
  return availableTargets();
}

interface HarNameValue {
  name: string;
  value: string;
}

/** Loosely-typed HAR request we build ourselves — @readme/httpsnippet's own
 * `HarRequest` type (from @types/har-format) declares several fields as
 * required that its `init()` step actually defaults for us at runtime
 * (httpVersion, headers, cookies, queryString, postData.mimeType). We build
 * only what we need and cast at the single call site in `generateSnippet`. */
export interface CodeSampleHarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarNameValue[];
  queryString: HarNameValue[];
  cookies: HarNameValue[];
  postData?: { mimeType: string; text: string };
}

interface ResolvedAuthPlaceholder {
  location: "header" | "query" | "cookie";
  name: string;
  value: string;
}

interface ResolvedRequestBodyMedia {
  contentType: string;
  schema?: unknown;
  authorExample?: unknown;
}

/** Substitutes each `{var}` in a server URL template with its declared
 * default (or first enum value, or the literal token as a last resort).
 * Falls back to a placeholder host when the operation has no server at all,
 * since HTTPSnippet's clients require an absolute URL. */
export function resolveServerBaseUrl(servers?: OpenAPIServerData[]): string {
  const server = servers?.[0];
  if (!server) return "http://localhost";

  let url = server.url;
  for (const [name, variable] of Object.entries(server.variables ?? {})) {
    const value = variable.default ?? variable.enum?.[0] ?? `{${name}}`;
    url = url.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
  }
  return url;
}

function hasExplicitExampleData(param: OpenAPIParameterData): boolean {
  if (param.example !== undefined) return true;
  if (param.examples && Object.keys(param.examples).length > 0) return true;
  const schema = param.schema as { example?: unknown; enum?: unknown[] } | undefined;
  if (schema?.example !== undefined) return true;
  if (schema?.enum && schema.enum.length > 0) return true;
  return false;
}

/** Precedence: `param.example` → first `param.examples[...].value` →
 * `schema.example` → first `schema.enum` value → a literal `{name}` token as
 * a last-resort placeholder, so an undocumented parameter still produces a
 * valid, copyable (if not runnable as-is) sample. */
export function resolveParamExampleValue(param: OpenAPIParameterData): string {
  if (param.example !== undefined) return String(param.example);

  if (param.examples) {
    for (const example of Object.values(param.examples)) {
      if (example && typeof example === "object" && "value" in example && example.value !== undefined) {
        return String(example.value);
      }
    }
  }

  const schema = param.schema as { example?: unknown; enum?: unknown[] } | undefined;
  if (schema?.example !== undefined) return String(schema.example);
  if (schema?.enum && schema.enum.length > 0) return String(schema.enum[0]);

  return `{${param.name}}`;
}

/** Substitutes `{token}` path placeholders using the matching `in: "path"`
 * parameter's example value. Falls back to the literal token when no
 * matching parameter is supplied — this is what keeps the sample valid even
 * for operations whose path parameter is only declared at the path-item
 * level (not merged into `op.parameters` today). */
export function buildRequestUrl(baseUrl: string, path: string, parameters: OpenAPIParameterData[]): string {
  const resolvedPath = path.replace(/\{([^}]+)\}/g, (match, token: string) => {
    const param = parameters.find((p) => p.in === "path" && p.name === token);
    if (!param) return match;
    const value = resolveParamExampleValue(param);
    // Don't percent-encode our own literal-placeholder fallback (e.g. "{petId}"
    // when the parameter has no example data) — encoding it would turn a
    // readable token into "%7BpetId%7D", which defeats the point of the fallback.
    return value === `{${token}}` ? value : encodeURIComponent(value);
  });
  return `${baseUrl.replace(/\/$/, "")}${resolvedPath}`;
}

/** Resolves the first `security`/`globalSecurity` OR-alternative against
 * `components.securitySchemes` into placeholder auth values, routed by
 * location (header/query/cookie) so the caller can feed them into the
 * matching HAR array. First code in the library to actually resolve a
 * security requirement against its scheme definition. */
export function resolveAuthPlaceholders(
  security: Array<Record<string, string[]>>,
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>,
): ResolvedAuthPlaceholder[] {
  const requirement = security[0];
  if (!requirement || !securitySchemes) return [];

  const placeholders: ResolvedAuthPlaceholder[] = [];
  for (const schemeName of Object.keys(requirement)) {
    const scheme = securitySchemes[schemeName];
    if (!scheme) continue;

    if (scheme.type === "apiKey") {
      // openapi-types declares ApiKeySecurityScheme.in as a plain `string` (not a
      // literal union), even though the OpenAPI spec only allows these three.
      const location = scheme.in === "query" || scheme.in === "cookie" ? scheme.in : "header";
      placeholders.push({ location, name: scheme.name, value: "YOUR_API_KEY" });
    } else if (scheme.type === "http") {
      const isBasic = scheme.scheme?.toLowerCase() === "basic";
      placeholders.push({
        location: "header",
        name: "Authorization",
        value: isBasic ? "Basic BASE64_ENCODED_CREDENTIALS" : "Bearer YOUR_ACCESS_TOKEN",
      });
    } else if (scheme.type === "oauth2" || scheme.type === "openIdConnect") {
      placeholders.push({ location: "header", name: "Authorization", value: "Bearer YOUR_ACCESS_TOKEN" });
    }
    // Other/unknown scheme types (e.g. mutualTLS) are dropped rather than guessed.
  }
  return placeholders;
}

/** Picks the request body media type to sample: prefers `application/json`,
 * else the first declared content type. Surfaces the author-supplied
 * `example`/`examples` value (never read anywhere else in the codebase
 * today) so the caller can prefer it over a schema-faker-generated one. */
export function pickRequestBodyMedia(requestBody?: OpenAPIRequestBodyData): ResolvedRequestBodyMedia | null {
  const content = requestBody?.content;
  if (!content) return null;

  const contentType = "application/json" in content ? "application/json" : Object.keys(content)[0];
  if (!contentType) return null;

  const media = content[contentType];
  let authorExample = media.example;
  if (authorExample === undefined && media.examples) {
    for (const example of Object.values(media.examples)) {
      if (example && typeof example === "object" && "value" in example && example.value !== undefined) {
        authorExample = example.value;
        break;
      }
    }
  }

  return { contentType, schema: media.schema, authorExample };
}

interface BuildHarRequestInput {
  method: HttpMethod;
  path: string;
  servers?: OpenAPIServerData[];
  parameters: OpenAPIParameterData[];
  security: Array<Record<string, string[]>>;
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>;
  media: ResolvedRequestBodyMedia | null;
  resolvedBodyValue: unknown;
}

/** Assembles a HAR request object from a resolved operation — the input to
 * `generateSnippet`/`@readme/httpsnippet`. Query parameters are supplied only
 * via the `queryString` array (not appended to `url`); HTTPSnippet's own
 * `prepare()` step reconstructs and encodes the final URL from that array. */
export function buildHarRequest(input: BuildHarRequestInput): CodeSampleHarRequest {
  const baseUrl = resolveServerBaseUrl(input.servers);
  const url = buildRequestUrl(baseUrl, input.path, input.parameters);
  const authPlaceholders = resolveAuthPlaceholders(input.security, input.securitySchemes);

  const headers: HarNameValue[] = [];
  const queryString: HarNameValue[] = [];
  const cookies: HarNameValue[] = [];

  for (const placeholder of authPlaceholders) {
    const target = placeholder.location === "header" ? headers : placeholder.location === "query" ? queryString : cookies;
    target.push({ name: placeholder.name, value: placeholder.value });
  }

  for (const param of input.parameters) {
    if (param.in === "query" && (param.required || hasExplicitExampleData(param))) {
      queryString.push({ name: param.name, value: resolveParamExampleValue(param) });
    }
  }

  const harRequest: CodeSampleHarRequest = {
    method: input.method.toUpperCase(),
    url,
    httpVersion: "HTTP/1.1",
    headers,
    queryString,
    cookies,
  };

  // @readme/httpsnippet's init() spreads our request object over its own
  // postData default (`{ mimeType: request.postData?.mimeType || "..." }, ...request`);
  // an explicit `postData: undefined` key would still win that spread and crash
  // its `prepare()` step, so the key must be entirely absent for bodyless requests.
  if (input.media && input.resolvedBodyValue !== undefined) {
    headers.push({ name: "Content-Type", value: input.media.contentType });
    harRequest.postData = { mimeType: input.media.contentType, text: JSON.stringify(input.resolvedBodyValue, null, 2) };
  }

  return harRequest;
}

type ConvertParams = Parameters<InstanceType<typeof HTTPSnippet>["convert"]>;

/** Generates a single target/client code sample for a resolved HAR request
 * via @readme/httpsnippet. Fails soft: an unsupported target/client pair or a
 * malformed request resolves to an empty string rather than throwing, so one
 * bad operation (or a stale dropdown selection) can't crash the panel.
 * `target`/`client` come from `getAvailableCodeSampleTargets()`'s own keys, so
 * they're always valid at the httpsnippet level — the cast below only works
 * around TargetId/ClientId not being exported types we can name directly. */
export function generateSnippet(harRequest: CodeSampleHarRequest, target: string, client: string): string {
  try {
    const snippet = new HTTPSnippet(harRequest as unknown as HarRequest);
    const [result] = snippet.convert(target as ConvertParams[0], client as ConvertParams[1]);
    return typeof result === "string" ? result : "";
  } catch {
    return "";
  }
}
