import { OpenAPIDocumentData, HTTP_METHODS } from "../types/openapi";
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

  if (openapi.paths) {
    for (const path of Object.keys(openapi.paths)) {
      const pathItem = openapi.paths[path];
      if (!pathItem) continue;
      for (const method of HTTP_METHODS) {
        const op = pathItem[method];
        if (!op) continue;
        const key = `${method} ${path}`;
        const name = op.summary ?? `${method.toUpperCase()} ${path}`;
        entries.push({
          id: `endpoint-${key}`,
          targetId: `endpoint-${key}-detail`,
          type: "endpoint",
          tab: "endpoints",
          key,
          name,
          path: `paths.${path}.${method}`,
          location: `Endpoints > ${method.toUpperCase()} ${path}`,
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
  }

  if (openapi.components?.schemas) {
    for (const [key, schema] of Object.entries(openapi.components.schemas)) {
      addSchemaEntries(entries, schema, key, key);
    }
  }

  return entries;
}
