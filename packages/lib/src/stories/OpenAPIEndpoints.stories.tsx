import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIEndpoints } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Endpoints",
  component: OpenAPIEndpoints,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "A table of every endpoint in an OpenAPI document. Each row shows the path and HTTP method. Click a row to open a panel with the parameters, request body, responses, and security.",
      stories: "Default or Stacked",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      alone: alignedAlone("Endpoints"),
      importNames: ["OpenAPIEndpoints", "OpenAPIInfo", "OpenAPIProvider"],
      componentName: "OpenAPIEndpoints",
      composedChildren: `  <OpenAPIInfo />
  <OpenAPIEndpoints />`,
    }),
  },
} satisfies Meta<typeof OpenAPIEndpoints>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the table lines up with Info and Servers. Click a row to open the detail panel. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width. Use this when Endpoints is the only section on the page. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
