import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIInfo } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { layoutArgType, sectionDocs } from "./sectionDocs";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Info",
  component: OpenAPIInfo,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The title, description, and version of an OpenAPI document, with license, contact, tags, and external docs beside it.",
      stories: "Default or Stacked",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      alone:
        '`layout="columns"` (the default) puts license, contact, tags, and external docs on the right. `layout="stacked"` places them below the description.',
      importNames: ["OpenAPIInfo", "OpenAPIEndpoints", "OpenAPIProvider"],
      componentName: "OpenAPIInfo",
      composedChildren: `  <OpenAPIInfo />
  <OpenAPIEndpoints />`,
    }),
  },
} satisfies Meta<typeof OpenAPIInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: license, contact, tags, and external docs on the right. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width, with license, contact, tags, and external docs below the description. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
