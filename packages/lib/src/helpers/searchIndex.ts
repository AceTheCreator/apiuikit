import { AsyncAPIDocumentData } from "../types/schema";
import { Server } from "../types/asyncapi/Server";

// "endpoints"/"endpoint" are OpenAPI's equivalent of AsyncAPI's "operations"/"operation" —
// added here (rather than a parallel SearchEntry type) so SearchPanel/useSpecSearch's
// consumers stay spec-agnostic; see helpers/openapiSearchIndex.ts.
export type SearchTab = "operations" | "messages" | "schemas" | "info" | "servers" | "endpoints";
export type SearchType = "operation" | "message" | "schema" | "info" | "server" | "endpoint";

export interface SearchEntry {
  id: string;
  targetId: string;
  type: SearchType;
  tab: SearchTab;
  key: string;
  name: string;
  path: string;
  location: string;
  subtitle?: string;
  text: string;
  focusSection?: string;
  schemaFocusTokens?: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const flattenText = (value: unknown, visited = new Set<object>()): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => flattenText(item, visited)).join(" ");
  }
  if (value instanceof Map) {
    return Array.from(value.entries())
      .flatMap(([key, item]) => [key, flattenText(item, visited)])
      .join(" ");
  }
  if (isRecord(value)) {
    if (visited.has(value)) return "";
    visited.add(value);
    return Object.entries(value)
      .flatMap(([key, item]) => [key, flattenText(item, visited)])
      .join(" ");
  }
  return "";
};

export const normalizeString = (value: unknown): string =>
  flattenText(value).trim().replace(/\s+/g, " ");

/** Matches SchemaNode's own id computation — see that component's doc for the token convention. */
const buildSchemaFocusId = (schemaKey: string, tokens: string[]): string =>
  tokens.length ? `schema-${schemaKey}-${tokens.join("-")}` : `schema-${schemaKey}`;

const SCHEMA_STRUCTURAL_KEYS = new Set([
  "properties", "items", "allOf", "oneOf", "anyOf", "additionalProperties",
  "patternProperties", "propertyNames", "not", "if", "then", "else",
  "contains", "additionalItems", "prefixItems", "definitions", "$defs",
]);

const shallowSchemaNode = (node: unknown): unknown => {
  if (!isRecord(node)) return node;
  const shallow: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SCHEMA_STRUCTURAL_KEYS.has(key)) shallow[key] = value;
  }
  return shallow;
};

/** Walks a single JSON Schema node into flat search entries — spec-agnostic (AsyncAPI and OpenAPI schemas share the same shape), reused by openapiSearchIndex.ts. */
export const addSchemaEntries = (
  entries: SearchEntry[],
  schema: unknown,
  schemaKey: string,
  schemaName: string,
) => {
  const rootTargetId = `schema-${schemaKey}`;

  const addEntry = (
    node: unknown,
    pathSegments: string[],
    locationSegments: string[],
    focusTokens: string[] | null,
  ) => {
    const path = `components.schemas.${schemaKey}${pathSegments.length ? `.${pathSegments.join(".")}` : ""}`;
    const location = `Schemas > ${schemaName}${locationSegments.length ? ` > ${locationSegments.join(" > ")}` : ""}`;
    const subtitle = isRecord(node) ? (node.description as string | undefined) : undefined;
    const name = pathSegments.length ? `${schemaName}.${pathSegments.join(".")}` : schemaName;

    entries.push({
      id: `schema-${schemaKey}-${pathSegments.join("-") || "root"}`,
      targetId: focusTokens ? buildSchemaFocusId(schemaKey, focusTokens) : rootTargetId,
      type: "schema",
      tab: "schemas",
      key: schemaKey,
      name,
      path,
      location,
      subtitle,
      text: normalizeString([shallowSchemaNode(node)]),
      schemaFocusTokens: focusTokens && focusTokens.length > 0 ? focusTokens : undefined,
    });
  };

  const walk = (
    node: unknown,
    pathSegments: string[] = [],
    locationSegments: string[] = [],
    focusTokens: string[] | null = [],
    visited = new Set<object>(),
  ) => {
    addEntry(node, pathSegments, locationSegments, focusTokens);

    if (!isRecord(node)) return;

    // Defense in depth: resolveDocument's contract says indexed documents are
    // acyclic (cycles arrive as `$ref` nodes), but this walker also runs over
    // whatever a caller hands it, so guard by identity rather than trusting
    // that and recursing forever if it's violated.
    if (visited.has(node)) return;
    visited.add(node);

    if (isRecord(node.properties)) {
      for (const [propName, propValue] of Object.entries(node.properties)) {
        walk(
          propValue,
          [...pathSegments, "properties", propName],
          [...locationSegments, propName],
          focusTokens ? [...focusTokens, "properties", propName] : null,
          visited,
        );
      }
    }

    const items = (node as Record<string, unknown>).items;
    if (isRecord(items)) {
      walk(
        items,
        [...pathSegments, "items"],
        [...locationSegments, "items"],
        focusTokens ? [...focusTokens, "items"] : null,
        visited,
      );
    } else if (Array.isArray(items)) {
      // Tuple-style (positional) items — outside the common-case precise walk.
      items.forEach((item, index) => {
        walk(item, [...pathSegments, `items[${index}]`], [...locationSegments, `items[${index}]`], null, visited);
      });
    }

    for (const keyword of ["allOf", "oneOf", "anyOf"] as const) {
      const branch = (node as Record<string, unknown>)[keyword];
      if (Array.isArray(branch)) {
        branch.forEach((item, index) => {
          walk(
            item,
            [...pathSegments, `${keyword}[${index}]`],
            [...locationSegments, `${keyword}[${index}]`],
            focusTokens && keyword !== "allOf" ? [...focusTokens, `${keyword}[${index}]`] : null,
            visited,
          );
        });
      }
    }

    if (isRecord((node as Record<string, unknown>).additionalProperties)) {
      walk(
        (node as Record<string, unknown>).additionalProperties,
        [...pathSegments, "additionalProperties"],
        [...locationSegments, "additionalProperties"],
        null,
        visited,
      );
    }
  };

  walk(schema);
};

export function buildSearchIndex(asyncapi: AsyncAPIDocumentData): SearchEntry[] {
  const entries: SearchEntry[] = [];

  if (asyncapi.info) {
    const title = asyncapi.info.title ?? "Info";
    const subtitle = asyncapi.info.description ?? undefined;
    entries.push({
      id: "info-panel",
      targetId: "info-panel",
      type: "info",
      tab: "info",
      key: "info",
      name: title,
      path: "info",
      location: "Info",
      subtitle,
      text: normalizeString([
        asyncapi.info,
        asyncapi.info.title,
        asyncapi.info.description,
        asyncapi.info.license,
        asyncapi.info.externalDocs,
        asyncapi.info.contact,
        asyncapi.info.tags,
      ]),
    });
  }

  if (asyncapi.servers) {
    for (const [key, server] of Object.entries(asyncapi.servers)) {
      const serverData = server as Server;
      const title = serverData.description ?? key;
      const subtitle = [serverData.protocol, serverData.host].filter(Boolean).join(" ");
      entries.push({
        id: `server-${key}`,
        targetId: `server-${key}`,
        type: "server",
        tab: "servers",
        key,
        name: key,
        path: `servers.${key}`,
        location: `Servers > ${key}`,
        subtitle,
        text: normalizeString([
          key,
          title,
          subtitle,
          serverData.description,
          serverData.protocol,
          serverData.host,
          serverData.variables,
          serverData.security,
          serverData.bindings,
        ]),
      });

      const security = serverData.security as unknown[] | undefined;
      if (Array.isArray(security) && security.length > 0) {
        entries.push({
          id: `server-${key}-security`,
          targetId: `server-${key}-security`,
          type: "server",
          tab: "servers",
          key,
          name: `${key} > Authorization`,
          path: `servers.${key}.security`,
          location: `Servers > ${key} > Authorization`,
          focusSection: "security",
          text: normalizeString(security),
        });
      }

      const bindings = serverData.bindings as Record<string, unknown> | undefined;
      const protocolBinding = isRecord(bindings) && serverData.protocol ? bindings[serverData.protocol] : undefined;
      if (protocolBinding != null) {
        entries.push({
          id: `server-${key}-bindings`,
          targetId: `server-${key}-bindings`,
          type: "server",
          tab: "servers",
          key,
          name: `${key} > ${serverData.protocol} configuration`,
          path: `servers.${key}.bindings.${serverData.protocol}`,
          location: `Servers > ${key} > ${serverData.protocol} configuration`,
          focusSection: `binding:${serverData.protocol}`,
          text: normalizeString(protocolBinding),
        });
      }
    }
  }

  if (asyncapi.operations) {
    for (const [key, operation] of Object.entries(asyncapi.operations)) {
      const name = operation.title ?? key;
      const subtitle = operation.summary ?? operation.description ?? operation.action ?? "";
      entries.push({
        id: `operation-${key}`,
        // Points at the side panel's own content, not the summary table row —
        // the row only shows a channel address and action badge, so most of
        // what's actually searchable (description, tags, …) only exists here.
        targetId: `operation-${key}-detail`,
        type: "operation",
        tab: "operations",
        key,
        name,
        path: `operations.${key}`,
        location: `Operations > ${name}`,
        subtitle,
        text: normalizeString([
          key,
          name,
          subtitle,
          operation.action,
          operation.channel,
          operation.messages,
          operation.reply,
          operation.traits,
          operation.bindings,
          operation.security,
          operation.tags,
        ]),
      });

      const security = operation.security as unknown[] | undefined;
      if (Array.isArray(security) && security.length > 0) {
        entries.push({
          id: `operation-${key}-security`,
          targetId: `operation-${key}-security`,
          type: "operation",
          tab: "operations",
          key,
          name: `${name} > Authorization`,
          path: `operations.${key}.security`,
          location: `Operations > ${name} > Authorization`,
          focusSection: "security",
          text: normalizeString(security),
        });
      }

      const bindings = operation.bindings as Record<string, unknown> | undefined;
      if (isRecord(bindings)) {
        for (const [protocol, binding] of Object.entries(bindings)) {
          if (binding == null) continue;
          entries.push({
            id: `operation-${key}-bindings-${protocol}`,
            targetId: `operation-${key}-bindings-${protocol}`,
            type: "operation",
            tab: "operations",
            key,
            name: `${name} > ${protocol} configuration`,
            path: `operations.${key}.bindings.${protocol}`,
            location: `Operations > ${name} > ${protocol} configuration`,
            focusSection: `binding:${protocol}`,
            text: normalizeString(binding),
          });
        }
      }
    }
  }

  if (asyncapi.components?.messages) {
    for (const [key, message] of Object.entries(asyncapi.components.messages)) {
      const name = message.title ?? message.name ?? key;
      const subtitle = message.summary ?? message.description ?? message.contentType ?? "";
      entries.push({
        id: `message-${key}`,
        targetId: `message-${key}`,
        type: "message",
        tab: "messages",
        key,
        name,
        path: `components.messages.${key}`,
        location: `Messages > ${name}`,
        subtitle,
        text: normalizeString([
          key,
          name,
          subtitle,
          message.contentType,
          message.payload,
          message.headers,
          message.correlationId,
          message.tags,
          message.externalDocs,
          message.bindings,
        ]),
      });

      if (message.payload) {
        entries.push({
          id: `message-${key}-payload`,
          targetId: `message-${key}`,
          type: "message",
          tab: "messages",
          key,
          name: `${name} > Payload`,
          path: `components.messages.${key}.payload`,
          location: `Messages > ${name} > Payload`,
          focusSection: "payload",
          text: normalizeString(message.payload),
        });
      }

      if (message.headers) {
        entries.push({
          id: `message-${key}-headers`,
          targetId: `message-${key}`,
          type: "message",
          tab: "messages",
          key,
          name: `${name} > Headers`,
          path: `components.messages.${key}.headers`,
          location: `Messages > ${name} > Headers`,
          focusSection: "headers",
          text: normalizeString(message.headers),
        });
      }
    }
  }

  if (asyncapi.components?.schemas) {
    for (const [key, schema] of Object.entries(asyncapi.components.schemas)) {
      addSchemaEntries(entries, schema, key, key);
    }
  }

  return entries;
}
