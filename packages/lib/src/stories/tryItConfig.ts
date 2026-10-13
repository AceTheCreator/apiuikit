import { defaultConfig, type ConfigInterface } from "../config";

/**
 * The library's defaults with Try it turned on. Spread rather than a bare
 * `{ show: { tryIt: true } }`, so the story changes only that one flag.
 */
export const tryItConfig: ConfigInterface = {
  ...defaultConfig,
  show: { ...defaultConfig.show, tryIt: true },
};

/** The Docs-page sentence the full-widget stories share. */
export const tryItNote = (spec: "AsyncAPI" | "OpenAPI") =>
  `**Try it** is on in these stories. It is off by default in your app: turn it on with \`config={{ show: { tryIt: true } }}\`. When it's on, readers' requests (and any credentials they enter) go to the document's servers, so it's your call.${
    spec === "AsyncAPI"
      ? " The AsyncAPI button is a WebSocket client, so it only appears for operations with a `ws` or `wss` server. The Base document has none; open **AsyncAPI → With Try It** for one that does."
      : " Open any endpoint to see the button in its panel header."
  }`;
