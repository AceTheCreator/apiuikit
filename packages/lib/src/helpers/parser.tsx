import AsyncAPI from "../containers/AsyncAPI/AsyncAPI";
import { AsyncAPIDocumentData } from "../types/schema";
import type { ConfigInterface } from "../config/config";
import type { AsyncAPIDocumentInterface } from "@asyncapi/parser";
import { registerAvroSchemaParser } from "./avro/avroSchemaParser";

async function loadParser() {
  try {
    const mod = await import("@asyncapi/parser/browser");
    // @asyncapi/parser/browser is a UMD bundle with no package.json `exports` map, so
    // its CJS/ESM default-export shape is ambiguous — different bundlers' interop
    // resolve it differently (e.g. Vite's dev-time esbuild pre-bundling exposes
    // `.default`, while some production Rollup builds resolve the module itself to
    // the class). Support both rather than assuming one.
    const Parser = mod.default ?? mod;
    if (typeof Parser !== "function") {
      throw new Error("Unexpected export shape from '@asyncapi/parser/browser'.");
    }
    return Parser;
  } catch (err) {
    console.error("[apiuikit] Failed to load '@asyncapi/parser/browser':", err);
    throw new Error(
      "[apiuikit] The parsed entry requires '@asyncapi/parser'. " +
        "Install it (`npm i @asyncapi/parser`), or use the `AsyncAPI` component with a pre-resolved document instead.",
    );
  }
}

export async function parseDocument(raw: string): Promise<{
  diagnostics: unknown[];
  document: AsyncAPIDocumentData | null;
}> {
  try {
    const Parser = await loadParser();
    const parser = new Parser();

    // Built-in Avro and Protobuf plugins: exact MIME lists plus any-version
    // registry fallbacks. Protobuf's registration is dynamically imported —
    // unlike Avro (pure TypeScript, no runtime dependency), it pulls in
    // protobufjs (~313 KB / ~80 KB gzip), so it's deferred behind the same
    // parse-time boundary as @asyncapi/parser itself instead of always
    // shipping in the eager bundle.
    registerAvroSchemaParser(parser);
    const { registerProtobufSchemaParser } = await import("./protobuf/protobufSchemaParser");
    registerProtobufSchemaParser(parser);

    const { document, diagnostics } = await parser.parse(raw);

    return {
      diagnostics,
      document: document ? unwrap(document) : null,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse document";

    return {
      diagnostics: [
        {
          message,
          path: [],
          severity: 0,
        },
      ],
      document: null,
    };
  }
}

export async function parseAndRender(raw: string, config?: ConfigInterface) {
  const { diagnostics, document } = await parseDocument(raw);

  return {
    diagnostics,
    view: document ? (
      <AsyncAPI kind="resolved" asyncapi={document} config={config} />
    ) : null,
  };
}

function unwrap(document: AsyncAPIDocumentInterface): AsyncAPIDocumentData {
  return document.json() as AsyncAPIDocumentData;
}
