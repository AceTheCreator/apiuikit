import { OpenAPIDocumentData, OpenAPIPathItemData, HTTP_METHODS } from "../types/openapi";
import { addSchemaEntries, normalizeString, SearchEntry } from "./searchIndex";

export function buildOpenAPISearchIndex(openapi: OpenAPIDocumentData): SearchEntry[] {
  const entries: SearchEntry[] = [];

  if (openapi.info) {
    const title = openapi.info.title ?? "Info";
    entries.push({
      id: "info-panel",
      targetId: "info-panel",
      type: "info",
      tab: "info",
      key: "info",
      name: title,
      path: "info",
      location: "Info",
      subtitle: openapi.info.description,
      text: normalizeString([openapi.info, openapi.tags, openapi.externalDocs]),
    });
  }

  if (openapi.servers) {
    openapi.servers.forEach((server, index) => {
      const key = `server-${index}`;
      entries.push({
        id: key,
        targetId: key,
        type: "server",
        tab: "servers",
        key,
        name: server.description ?? server.url ?? key,
        path: `servers[${index}]`,
        location: `Servers > ${server.url ?? key}`,
        subtitle: server.url,
        text: normalizeString([server.url, server.description, server.variables]),
      });
    });
  }

  // `paths` and 3.1's `webhooks` hold the same Path Item shape and differ only
  // in what the key means (URL path vs event name), so they index identically
  // apart from their tab, anchor prefix, and labels.
  const addPathItemEntries = (
    pathItems: Record<string, OpenAPIPathItemData | undefined>,
    {
      tab,
      type,
      idPrefix,
      docKey,
      sectionLabel,
    }: {
      tab: "endpoints" | "webhooks";
      type: "endpoint" | "webhook";
      idPrefix: string;
      docKey: string;
      sectionLabel: string;
    },
  ) => {
    for (const path of Object.keys(pathItems)) {
      const pathItem = pathItems[path];
      if (!pathItem) continue;
      for (const method of HTTP_METHODS) {
        const op = pathItem[method];
        if (!op) continue;
        const key = `${method} ${path}`;
        const name = op.summary ?? `${method.toUpperCase()} ${path}`;
        entries.push({
          id: `${idPrefix}-${key}`,
          targetId: `${idPrefix}-${key}-detail`,
          type,
          tab,
          key,
          name,
          path: `${docKey}.${path}.${method}`,
          location: `${sectionLabel} > ${method.toUpperCase()} ${path}`,
          subtitle: op.description,
          text: normalizeString([
            method,
            path,
            op.summary,
            op.description,
            op.operationId,
            op.tags,
            op.parameters,
            op.security,
          ]),
        });
      }
    }
  };

  if (openapi.paths) {
    addPathItemEntries(openapi.paths, {
      tab: "endpoints",
      type: "endpoint",
      idPrefix: "endpoint",
      docKey: "paths",
      sectionLabel: "Endpoints",
    });
  }

  if (openapi.webhooks) {
    addPathItemEntries(openapi.webhooks, {
      tab: "webhooks",
      type: "webhook",
      idPrefix: "webhook",
      docKey: "webhooks",
      sectionLabel: "Webhooks",
    });
  }

  if (openapi.components?.schemas) {
    for (const [key, schema] of Object.entries(openapi.components.schemas)) {
      addSchemaEntries(entries, schema, key, key);
    }
  }

  return entries;
}
