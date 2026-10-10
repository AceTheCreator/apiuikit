import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIServers } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { layoutArgType, sectionDocs } from "./sectionDocs";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Servers",
  component: OpenAPIServers,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The servers an OpenAPI document can call. Choose a server to see its URL, description, and variables.",
      stories: "Default or Stacked",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      alone:
        '`layout="columns"` (the default) puts the server list on the right. `layout="stacked"` places the list below the server detail.',
      importNames: ["OpenAPIServers", "OpenAPIEndpoints", "OpenAPIProvider"],
      componentName: "OpenAPIServers",
      composedChildren: `  <OpenAPIServers />
  <OpenAPIEndpoints />`,
    }),
  },
} satisfies Meta<typeof OpenAPIServers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: the server list on the right. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width, with the server list below the server detail. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
