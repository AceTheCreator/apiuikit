import OpenAPI from "../containers/OpenAPI/OpenAPI";
import type { ConfigInterface } from "../config/config";
import { parseDocument } from "./openapiDocumentParser";

// Parsing lives in openapiDocumentParser.ts, free of React, so the Arazzo
// model can parse OpenAPI sources without pulling in the page components.
export { parseDocument } from "./openapiDocumentParser";
export type { OpenAPIDiagnostic, OpenAPIParseResult } from "./openapiDocumentParser";

export async function parseAndRender(raw: string, config?: ConfigInterface) {
  const { diagnostics, document } = await parseDocument(raw);

  return {
    diagnostics,
    view: document ? <OpenAPI openapi={document} config={config} /> : null,
  };
}
