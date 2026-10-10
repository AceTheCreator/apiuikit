import type { Meta, StoryObj } from "@storybook/react";
import AsyncAPI from "../containers/AsyncAPI/AsyncAPI";
import type { AsyncAPIDocumentData } from "../types/schema";
import torture from "../config/examples/streetlight-kafka.json";
import { widgetDocs } from "./sectionDocs";
import { tryItConfig, tryItNote } from "./tryItConfig";
import { wsEchoDocument } from "./wsEchoDocument";

const meta = {
  title: "AsyncAPI/AsyncAPI",
  component: AsyncAPI,
  tags: ["autodocs"],
  // Full-page widget with a sidebar, search, and portaled content: doesn't
  // render correctly embedded inline on the docs page. See noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      note: tryItNote("AsyncAPI"),
      summary:
        "A full AsyncAPI documentation page: sidebar, search, servers, operations, messages, and schemas. Pass `asyncapi` the parsed JSON. `$ref`s in that object are resolved for you. If the document is a YAML or JSON string, use `AsyncAPIRenderer`, which parses the text first.",
      stories: "Base or With Try It",
      code: `import { AsyncAPI } from "apiuikit";
import "apiuikit/style.css";

// asyncapiDocument is the parsed AsyncAPI JSON.
<AsyncAPI asyncapi={asyncapiDocument} config={{ show: { tryIt: true } }} />`,
    }),
  },
} satisfies Meta<typeof AsyncAPI>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full page for a parsed AsyncAPI document. */
export const Base: Story = {
  args: {
    config: tryItConfig,
    asyncapi: torture as unknown as AsyncAPIDocumentData,
  },
};

/**
 * A document with a WebSocket server, so the Try it button actually appears:
 * the AsyncAPI button only does for `ws`/`wss` servers, and the Base document
 * has none. Open an operation to see it in the panel header.
 */
export const WithTryIt: Story = {
  args: {
    asyncapi: wsEchoDocument,
    config: tryItConfig,
  },
};
