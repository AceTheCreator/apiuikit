/**
 * Serializes a resolved AsyncAPI/OpenAPI document (or a single OpenAPI
 * endpoint) into Markdown, for the "Copy for LLM" / "View as Markdown"
 * export button (components/MarkdownExportMenu.tsx) and, for a single
 * endpoint, the "Agent Prompt" entry in OpenAPI's code-sample dropdown
 * (components/CodeSamples.tsx, via `openApiEndpointToMarkdown`). Mirrors the
 * field names each section component (Information, Servers, Operations,
 * Messages, Schemas / Paths) already renders, just emitting Markdown instead
 * of JSX. Schemas are embedded as fully-dereferenced fenced ```json code
 * blocks rather than flattened into nested headings.
 */
import { AsyncAPIDocumentData, SchemaNodeData } from "../types/schema";
import {
  HttpMethod,
  OpenAPIDocumentData,
  OpenAPIOperationData,
  OpenAPISecuritySchemeData,
  flattenEndpoints,
} from "../types/openapi";
import { Channel } from "../types/asyncapi/Channel";
import { MessageObject } from "../types/asyncapi/MessageObject";
import { Operation } from "../types/asyncapi/Operation";
import { resolveSchemaInput } from "./schemaFormat";
import { createDocumentDeref, type Deref } from "./jsonPointer";

const heading = (level: number, text: string) => `${"#".repeat(level)} ${text}`;

/** Strips characters that would break a Markdown heading/inline-code span. */
const safe = (value: unknown): string =>
  typeof value === "string" ? value.replace(/`/g, "'") : String(value ?? "");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Schemas already entered on this walk, tracked the same way
 * components/schema/SchemaNode.tsx does (see its `ancestors` prop): by
 * object identity (catches real cycles a with-parser document can hand
 * back, e.g. @scalar/openapi-parser's fully-dereferenced output) AND by
 * `$ref` string (catches resolveDocument.ts's leftover-`$ref` markers for
 * cycles it couldn't safely inline). Either mechanism alone misses cases
 * the other path produces, so both are checked.
 */
interface SchemaAncestors {
  objects: Set<unknown>;
  refs: Set<string>;
}

const EMPTY_ANCESTORS: SchemaAncestors = { objects: new Set(), refs: new Set() };

/**
 * Deep-walks a schema node into a plain JSON-serializable value, inlining
 * every `$ref` it can resolve via `deref` (rather than flattening the tree
 * into Markdown headings — the resulting object is meant to be
 * JSON.stringify'd into a fenced code block by the caller). Generic over
 * every key (not just JSON-Schema keywords), so combinators, `not`, and
 * vendor extensions all come along for free.
 *
 * Cycle-safe the same way the old flattener was: ancestor tracking is
 * cloned per-branch (not a single mutated set) so a schema legitimately
 * shared by two `$ref`s (resolveDocument.ts's `copies` aliasing) isn't
 * mistaken for a cycle, while a real repeat — either the same object by
 * identity (with-parser fully-dereferenced docs can have real object
 * cycles) or the same `$ref` string seen twice (resolveDocument.ts leaves
 * cycle-forming refs unresolved rather than inlining them into a real
 * cycle) — stops recursion.
 */
function resolveSchemaTree(schema: unknown, deref: Deref | undefined, ancestors: SchemaAncestors = EMPTY_ANCESTORS): unknown {
  if (schema === null || typeof schema !== "object") return schema;

  if (ancestors.objects.has(schema) || (isRecord(schema) && typeof schema.$ref === "string" && ancestors.refs.has(schema.$ref))) {
    const parserSchemaId = isRecord(schema) ? schema["x-parser-schema-id"] : undefined;
    return typeof parserSchemaId === "string"
      ? { $ref: `#/components/schemas/${parserSchemaId} (circular)` }
      : "[circular reference]";
  }

  const childAncestors: SchemaAncestors = {
    objects: new Set(ancestors.objects).add(schema),
    refs: isRecord(schema) && typeof schema.$ref === "string" ? new Set(ancestors.refs).add(schema.$ref) : ancestors.refs,
  };

  if (Array.isArray(schema)) {
    return schema.map((item) => resolveSchemaTree(item, deref, childAncestors));
  }

  if (isRecord(schema) && typeof schema.$ref === "string") {
    const target = deref?.(schema.$ref);
    if (isRecord(target) || Array.isArray(target)) {
      return resolveSchemaTree(target, deref, childAncestors);
    }
    return { $ref: schema.$ref };
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = resolveSchemaTree(value, deref, childAncestors);
  }
  return result;
}

/** Resolves `schema` and renders it as a heading + fenced ```json code block. */
function schemaTreeToMarkdown(name: string, schema: SchemaNodeData | undefined, deref?: Deref): string {
  if (!schema) return "";
  const resolved = resolveSchemaTree(schema, deref);
  return `${heading(4, `\`${safe(name)}\``)}\n\n\`\`\`json\n${JSON.stringify(resolved, null, 2)}\n\`\`\``;
}

function resolvedSchemaToMarkdown(name: string, input: unknown, deref: Deref): string {
  if (!input || typeof input === "boolean") return "";
  const { schema, description, conversionError, pendingConversion } = resolveSchemaInput(input, deref);
  if (pendingConversion) return `${heading(4, `\`${safe(name)}\``)}\n\n_(schema conversion still in progress)_`;
  if (conversionError) return `${heading(4, `\`${safe(name)}\``)}\n\n_(could not convert schema: ${safe(conversionError)})_`;
  const withDescription = description && !schema.description ? { ...schema, description } : schema;
  return schemaTreeToMarkdown(name, withDescription, deref);
}

/**
 * Fields this file reads off a security scheme — a loose subset of the
 * type-specific shapes across both OpenAPI's `SecuritySchemeObject` union and
 * AsyncAPI's several scheme types (UserPassword, ApiKey, X509,
 * BearerHttpSecurityScheme, ApiKeyHttpSecurityScheme, Oauth2Flows,
 * OpenIdConnect, the Sasl* schemes), mirroring `Authorization.tsx`'s
 * `SecuritySchemeData` — the same component renders either spec's scheme
 * from this shape, so the Markdown export reads it the same way.
 */
interface SecuritySchemeLike {
  type?: string;
  description?: string;
  in?: string;
  name?: string;
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  flows?: Record<
    string,
    { authorizationUrl?: string; tokenUrl?: string; refreshUrl?: string; scopes?: Record<string, string>; availableScopes?: Record<string, string> }
  >;
}

/** Human label for a scheme, mirroring `Authorization.tsx`'s tab naming so the Markdown export and the UI agree on terminology. */
function securitySchemeLabel(scheme: SecuritySchemeLike): string {
  switch (scheme.type) {
    case "apiKey":
    case "httpApiKey":
      return `API Key (${safe(scheme.in)}${scheme.name ? `: \`${safe(scheme.name)}\`` : ""})`;
    case "http":
      return scheme.scheme?.toLowerCase() === "basic"
        ? "HTTP Basic"
        : `HTTP Bearer${scheme.bearerFormat ? ` (format: ${safe(scheme.bearerFormat)})` : ""}`;
    case "openIdConnect":
      return "OpenID Connect";
    case "oauth2":
      return "OAuth2";
    case "mutualTLS":
      return "Mutual TLS";
    case "X509":
      return "X.509 Certificate";
    case "userPassword":
      return "User / Password";
    case "plain":
    case "scramSha256":
    case "scramSha512":
      return "SASL";
    case "gssapi":
      return "SASL (GSSAPI)";
    case "symmetricEncryption":
      return "Symmetric Encryption";
    case "asymmetricEncryption":
      return "Asymmetric Encryption";
    default:
      return safe(scheme.type);
  }
}

/**
 * Builds the "**Authorization:**" block for a server's `security` list.
 * Unlike OpenAPI's per-operation `security` (requirement names + scopes,
 * resolved against `components.securitySchemes`), AsyncAPI's server
 * `security` is already a list of the actual scheme objects — refs inlined
 * by `resolveDocument` the same way `Server.tsx` receives them before
 * passing straight to `Authorization`.
 */
function serverSecurityToMarkdown(security: SecuritySchemeLike[] | undefined): string {
  if (!security?.length) return "";

  const lines: string[] = [];
  for (const scheme of security) {
    if (!scheme?.type) continue;

    lines.push(`- **${securitySchemeLabel(scheme)}**`);
    if (scheme.description) lines.push(`  ${safe(scheme.description)}`);

    if (scheme.type === "openIdConnect" && scheme.openIdConnectUrl) {
      lines.push(`  - OpenID Connect URL: \`${safe(scheme.openIdConnectUrl)}\``);
    }

    if (scheme.type === "oauth2") {
      for (const [flowName, flowData] of Object.entries(scheme.flows ?? {})) {
        lines.push(`  - Flow \`${safe(flowName)}\`:`);
        if (flowData.authorizationUrl) lines.push(`    - Authorization URL: \`${safe(flowData.authorizationUrl)}\``);
        if (flowData.tokenUrl) lines.push(`    - Token URL: \`${safe(flowData.tokenUrl)}\``);
        if (flowData.refreshUrl) lines.push(`    - Refresh URL: \`${safe(flowData.refreshUrl)}\``);
        const scopes = Object.keys(flowData.availableScopes ?? flowData.scopes ?? {});
        if (scopes.length) lines.push(`    - Available scopes: ${scopes.map((s) => `\`${safe(s)}\``).join(", ")}`);
      }
    }
  }

  return lines.length ? ["**Authorization:**", lines.join("\n")].join("\n\n") : "";
}

/** Builds the Title/Version/License/Contact/Description + Servers header shared
 * by the full-document export and the single-operation export. */
function asyncApiHeaderToMarkdown(doc: AsyncAPIDocumentData): string[] {
  const sections: string[] = [];

  const { info } = doc;
  sections.push(heading(1, safe(info.title)));
  const meta: string[] = [`**Version:** ${safe(info.version)}`];
  if (info.license) {
    meta.push(`**License:** ${safe(info.license.name)}${info.license.url ? ` (${safe(info.license.url)})` : ""}`);
  }
  if (info.contact) {
    const contact = [info.contact.name, info.contact.email].filter(Boolean).map(safe).join(" ");
    if (contact) meta.push(`**Contact:** ${contact}`);
  }
  sections.push(meta.join("  \n"));
  if (info.description) sections.push(safe(info.description));

  if (doc.servers && Object.keys(doc.servers).length) {
    const serverSections = [heading(2, "Servers")];
    for (const [name, server] of Object.entries(doc.servers)) {
      serverSections.push(heading(3, safe(name)));
      const lines: string[] = [`**Host:** \`${safe(server.host)}${server.pathname ? safe(server.pathname) : ""}\``];
      lines.push(`**Protocol:** ${safe(server.protocol)}${server.protocolVersion ? ` ${safe(server.protocolVersion)}` : ""}`);
      if (server.description) lines.push(safe(server.description));
      serverSections.push(lines.join("  \n"));
      const securityMarkdown = serverSecurityToMarkdown(server.security as SecuritySchemeLike[] | undefined);
      if (securityMarkdown) serverSections.push(securityMarkdown);
    }
    sections.push(serverSections.join("\n\n"));
  }

  return sections;
}

export function asyncApiToMarkdown(doc: AsyncAPIDocumentData, deref: Deref = createDocumentDeref(doc)): string {
  const sections: string[] = asyncApiHeaderToMarkdown(doc);

  if (doc.operations && Object.keys(doc.operations).length) {
    const opSections = [heading(2, "Operations")];
    for (const [key, op] of Object.entries(doc.operations)) {
      const channel = op.channel as unknown as Channel | undefined;
      opSections.push(heading(3, `${safe(op.action?.toUpperCase())} \`${safe(key)}\``));
      const lines: string[] = [];
      if (channel?.address) lines.push(`**Channel:** \`${safe(channel.address)}\``);
      if (op.summary) lines.push(safe(op.summary));
      if (op.description) lines.push(safe(op.description));
      const messages = (op.messages ?? []) as unknown as MessageObject[];
      if (messages.length) {
        lines.push(`**Messages:** ${messages.map((m) => `\`${safe(m.name ?? m.title ?? "message")}\``).join(", ")}`);
      }
      opSections.push(lines.join("\n\n"));
    }
    sections.push(opSections.join("\n\n"));
  }

  const messages = doc.components?.messages;
  if (messages && Object.keys(messages).length) {
    const msgSections = [heading(2, "Messages")];
    for (const [key, message] of Object.entries(messages)) {
      msgSections.push(heading(3, safe(message.title ?? message.name ?? key)));
      const lines: string[] = [];
      if (message.summary) lines.push(safe(message.summary));
      if (message.description) lines.push(safe(message.description));
      if (message.contentType) lines.push(`**Content-Type:** \`${safe(message.contentType)}\``);
      msgSections.push(lines.join("\n\n"));
      if (message.payload) msgSections.push(resolvedSchemaToMarkdown("payload", message.payload, deref));
      if (message.headers) msgSections.push(resolvedSchemaToMarkdown("headers", message.headers, deref));
    }
    sections.push(msgSections.join("\n\n"));
  }

  const schemas = doc.components?.schemas;
  if (schemas && Object.keys(schemas).length) {
    const schemaSections = [heading(2, "Schemas")];
    for (const [name, schema] of Object.entries(schemas)) {
      schemaSections.push(resolvedSchemaToMarkdown(name, schema, deref));
    }
    sections.push(schemaSections.join("\n\n"));
  }

  return sections.filter(Boolean).join("\n\n");
}

/**
 * Builds a self-contained Markdown section for a single AsyncAPI operation:
 * channel/summary/description, followed by each associated message's title
 * and fully-dereferenced payload/headers as JSON code blocks. Unlike the
 * full-document export's terser Operations loop (which just lists message
 * names, leaving payload detail to the separate Messages section), this
 * inlines everything so the snippet stands alone. Exposed publicly via
 * `asyncApiOperationToMarkdown` (see `helpers/specAdapters.ts`); AsyncAPI's
 * own code-sample dropdown doesn't use it — its Agent Prompt comes from
 * `asyncsnippet` instead (see `helpers/asyncCodeSample.ts`).
 */
function operationSectionToMarkdown(key: string, op: Operation, deref: Deref): string {
  const channel = op.channel as unknown as Channel | undefined;
  const sections = [heading(3, `${safe(op.action?.toUpperCase())} \`${safe(key)}\``)];
  const lines: string[] = [];
  if (channel?.address) lines.push(`**Channel:** \`${safe(channel.address)}\``);
  if (op.summary) lines.push(safe(op.summary));
  if (op.description) lines.push(safe(op.description));
  sections.push(lines.join("\n\n"));

  const messages = (op.messages ?? []) as unknown as MessageObject[];
  for (const message of messages) {
    const msgLines = [heading(4, safe(message.title ?? message.name ?? "Message"))];
    const meta: string[] = [];
    if (message.summary) meta.push(safe(message.summary));
    if (message.description) meta.push(safe(message.description));
    if (message.contentType) meta.push(`**Content-Type:** \`${safe(message.contentType)}\``);
    if (meta.length) msgLines.push(meta.join("\n\n"));
    sections.push(msgLines.join("\n\n"));
    if (message.payload) sections.push(resolvedSchemaToMarkdown("payload", message.payload, deref));
    if (message.headers) sections.push(resolvedSchemaToMarkdown("headers", message.headers, deref));
  }

  return sections.filter(Boolean).join("\n\n");
}

/** Builds a self-contained Markdown snippet for a single AsyncAPI operation:
 * doc info + servers, followed by that one operation's section (see
 * `operationSectionToMarkdown`), as opposed to `asyncApiToMarkdown`'s
 * whole-document export. */
export function asyncApiOperationToMarkdown(doc: AsyncAPIDocumentData, key: string, deref: Deref = createDocumentDeref(doc)): string {
  const op = doc.operations?.[key];
  if (!op) return "";
  const sections = asyncApiHeaderToMarkdown(doc);
  sections.push(operationSectionToMarkdown(key, op, deref));
  return sections.filter(Boolean).join("\n\n");
}

/**
 * Builds the "**Authorization:**" block for one operation's `security`
 * requirements, resolved against `components.securitySchemes` — mirrors
 * `PathOperation.tsx`'s resolution (union each requirement's scopes per
 * scheme name, drop requirement entries whose scheme name isn't defined)
 * so the Markdown export shows the same auth info as the Authorization
 * panel in the UI, not just the bare requirement names.
 */
function securityRequirementToMarkdown(
  security: Array<Record<string, string[]>>,
  securitySchemes: Record<string, OpenAPISecuritySchemeData> | undefined,
): string {
  if (!security.length || !securitySchemes) return "";

  const requiredScopesByScheme = new Map<string, string[]>();
  for (const requirement of security) {
    for (const [schemeName, scopes] of Object.entries(requirement)) {
      if (!scopes.length) continue;
      const existing = requiredScopesByScheme.get(schemeName) ?? [];
      requiredScopesByScheme.set(schemeName, Array.from(new Set([...existing, ...scopes])));
    }
  }

  const names = Array.from(new Set(security.flatMap((requirement) => Object.keys(requirement))));
  const lines: string[] = [];
  for (const name of names) {
    const scheme = securitySchemes[name] as SecuritySchemeLike | undefined;
    if (!scheme) continue;

    const requiredScopes = requiredScopesByScheme.get(name);
    lines.push(`- **${securitySchemeLabel(scheme)}** (\`${safe(name)}\`)`);
    if (scheme.description) lines.push(`  ${safe(scheme.description)}`);

    if (scheme.type === "openIdConnect" && scheme.openIdConnectUrl) {
      lines.push(`  - OpenID Connect URL: \`${safe(scheme.openIdConnectUrl)}\``);
    }

    if (scheme.type === "oauth2") {
      for (const [flowName, flowData] of Object.entries(scheme.flows ?? {})) {
        lines.push(`  - Flow \`${safe(flowName)}\`:`);
        if (flowData.authorizationUrl) lines.push(`    - Authorization URL: \`${safe(flowData.authorizationUrl)}\``);
        if (flowData.tokenUrl) lines.push(`    - Token URL: \`${safe(flowData.tokenUrl)}\``);
        if (flowData.refreshUrl) lines.push(`    - Refresh URL: \`${safe(flowData.refreshUrl)}\``);
        const scopes = requiredScopes?.length ? requiredScopes : Object.keys(flowData.scopes ?? {});
        if (scopes.length) {
          lines.push(
            `    - ${requiredScopes?.length ? "Required scopes" : "Scopes"}: ${scopes.map((s) => `\`${safe(s)}\``).join(", ")}`,
          );
        }
      }
    } else if (requiredScopes?.length) {
      lines.push(`  - Required scopes: ${requiredScopes.map((s) => `\`${safe(s)}\``).join(", ")}`);
    }
  }

  return lines.length ? ["**Authorization:**", lines.join("\n")].join("\n\n") : "";
}

/** Builds the Markdown section for a single OpenAPI operation: summary/description,
 * authorization, parameters grouped by location, request body, and responses —
 * shared by the full-document export's endpoint loop and the single-endpoint export. */
function endpointSectionToMarkdown(
  method: HttpMethod,
  path: string,
  op: OpenAPIOperationData,
  deref: Deref,
  securitySchemes?: Record<string, OpenAPISecuritySchemeData>,
  globalSecurity?: Array<Record<string, string[]>>,
): string {
  const endpointSections = [heading(3, `${method.toUpperCase()} \`${safe(path)}\``)];
  const lines: string[] = [];
  if (op.summary) lines.push(safe(op.summary));
  if (op.description) lines.push(safe(op.description));
  if (op.deprecated) lines.push("**Deprecated**");

  const security = op.security ?? globalSecurity ?? [];
  const securityMarkdown = securityRequirementToMarkdown(security, securitySchemes);
  if (securityMarkdown) lines.push(securityMarkdown);

  for (const location of ["path", "query", "header", "cookie"] as const) {
    const params = (op.parameters ?? []).filter((p) => p.in === location);
    if (!params.length) continue;
    lines.push(`**${location[0].toUpperCase()}${location.slice(1)} Parameters:**`);
    for (const param of params) {
      const schema = param.schema as { type?: string } | undefined;
      lines.push(
        `- \`${safe(param.name)}\`${param.required ? " (required)" : ""}${
          schema?.type ? ` — ${safe(schema.type)}` : ""
        }${param.description ? `: ${safe(param.description)}` : ""}`,
      );
    }
  }
  endpointSections.push(lines.join("\n\n"));

  const requestBodyContent = op.requestBody?.content ?? {};
  for (const [mediaType, media] of Object.entries(requestBodyContent)) {
    endpointSections.push(
      [`**Request Body** (\`${safe(mediaType)}\`)`, schemaTreeToMarkdown("body", media.schema as SchemaNodeData, deref)].join(
        "\n\n",
      ),
    );
  }

  const responses = op.responses ?? {};
  for (const [status, response] of Object.entries(responses)) {
    const responseLines = [heading(4, `${status}${response.description ? `: ${safe(response.description)}` : ""}`)];
    for (const [mediaType, media] of Object.entries(response.content ?? {})) {
      responseLines.push(
        [`**Body** (\`${safe(mediaType)}\`)`, schemaTreeToMarkdown("body", media.schema as SchemaNodeData, deref)].join(
          "\n\n",
        ),
      );
    }
    endpointSections.push(responseLines.join("\n\n"));
  }

  return endpointSections.join("\n\n");
}

export function openApiToMarkdown(doc: OpenAPIDocumentData, deref: Deref = createDocumentDeref(doc)): string {
  const sections: string[] = [];

  const { info } = doc;
  sections.push(heading(1, safe(info.title)));
  sections.push(`**Version:** ${safe(info.version)}`);
  if (info.description) sections.push(safe(info.description));

  if (doc.servers?.length) {
    const serverSections = [heading(2, "Servers")];
    for (const server of doc.servers) {
      serverSections.push(`- \`${safe(server.url)}\`${server.description ? ` — ${safe(server.description)}` : ""}`);
    }
    sections.push(serverSections.join("\n"));
  }

  const endpoints = doc.paths ? flattenEndpoints(doc.paths) : [];
  if (endpoints.length) {
    const endpointSections = [heading(2, "Endpoints")];
    for (const { method, path } of endpoints) {
      const op = doc.paths?.[path]?.[method];
      if (!op) continue;
      endpointSections.push(
        endpointSectionToMarkdown(method, path, op, deref, doc.components?.securitySchemes, doc.security),
      );
    }
    sections.push(endpointSections.join("\n\n"));
  }

  const schemas = doc.components?.schemas;
  if (schemas && Object.keys(schemas).length) {
    const schemaSections = [heading(2, "Schemas")];
    for (const [name, schema] of Object.entries(schemas)) {
      schemaSections.push(schemaTreeToMarkdown(name, schema, deref));
    }
    sections.push(schemaSections.join("\n\n"));
  }

  return sections.filter(Boolean).join("\n\n");
}

/**
 * Builds a self-contained Markdown snippet for a single OpenAPI endpoint:
 * doc info + servers (so the snippet stands alone without the rest of the
 * document) followed by that one endpoint's fully-dereferenced parameters,
 * request body, and responses, as opposed to `openApiToMarkdown`'s
 * whole-document export. Backs the "Agent Prompt" entry in the endpoint's
 * code-sample dropdown (components/CodeSamples.tsx).
 */
export function openApiEndpointToMarkdown(doc: OpenAPIDocumentData, method: HttpMethod, path: string, deref: Deref = createDocumentDeref(doc)): string {
  const op = doc.paths?.[path]?.[method];
  if (!op) return "";

  const sections: string[] = [];

  const { info } = doc;
  sections.push(heading(1, safe(info.title)));
  sections.push(`**Version:** ${safe(info.version)}`);
  if (info.description) sections.push(safe(info.description));

  if (doc.servers?.length) {
    const serverSections = [heading(2, "Servers")];
    for (const server of doc.servers) {
      serverSections.push(`- \`${safe(server.url)}\`${server.description ? ` — ${safe(server.description)}` : ""}`);
    }
    sections.push(serverSections.join("\n"));
  }

  sections.push(endpointSectionToMarkdown(method, path, op, deref, doc.components?.securitySchemes, doc.security));

  return sections.filter(Boolean).join("\n\n");
}
