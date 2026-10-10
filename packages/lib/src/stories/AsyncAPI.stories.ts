import type { Meta, StoryObj } from "@storybook/react";
import AsyncAPI from "../containers/AsyncAPI/AsyncAPI";
import type { AsyncAPIDocumentData } from "../types/schema";
import torture from "../config/examples/streetlight-kafka.json";
import { widgetDocs } from "./sectionDocs";

const meta = {
  title: "AsyncAPI/AsyncAPI",
  component: AsyncAPI,
  tags: ["autodocs"],
  // Full-page widget with a sidebar, search, and portaled content: doesn't
  // render correctly embedded inline on the docs page. See noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      summary:
        "A full AsyncAPI documentation page: sidebar, search, servers, operations, messages, and schemas. Pass `asyncapi` the parsed JSON. `$ref`s in that object are resolved for you. If the document is a YAML or JSON string, use `AsyncAPIRenderer`, which parses the text first.",
      stories: "Base",
      code: `import { AsyncAPI } from "apiuikit";
import "apiuikit/style.css";

// asyncapiDocument is the parsed AsyncAPI JSON.
<AsyncAPI asyncapi={asyncapiDocument} />`,
    }),
  },
} satisfies Meta<typeof AsyncAPI>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full page for a parsed AsyncAPI document. */
export const Base: Story = {
  args: {
    asyncapi: torture as unknown as AsyncAPIDocumentData,
  },
};
