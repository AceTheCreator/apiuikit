import type { Meta, StoryObj } from "@storybook/react";
import OpenAPI from "../containers/OpenAPI/OpenAPI";
import type { OpenAPIDocumentData } from "../types/openapi";
import petstore from "../config/examples/openapi-petstore.json";
import { widgetDocs } from "./sectionDocs";

const meta = {
  title: "OpenAPI/OpenAPI",
  component: OpenAPI,
  tags: ["autodocs"],
  // Full-page widget with a sidebar, search, and portaled content: doesn't
  // render correctly embedded inline on the docs page. See noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      summary:
        "A full OpenAPI documentation page: sidebar, search, servers, endpoints, and schemas. Webhooks appear when the document declares them. Pass `openapi` the parsed JSON. `$ref`s in that object are resolved for you. If the document is a YAML or JSON string, use `OpenAPIRenderer`, which parses the text first.",
      stories: "Base",
      code: `import { OpenAPI } from "apiuikit";
import "apiuikit/style.css";

// openapiDocument is the parsed OpenAPI JSON.
<OpenAPI openapi={openapiDocument} />`,
    }),
  },
} satisfies Meta<typeof OpenAPI>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The full page for a parsed OpenAPI document. */
export const Base: Story = {
  args: {
    openapi: petstore as unknown as OpenAPIDocumentData,
  },
};
