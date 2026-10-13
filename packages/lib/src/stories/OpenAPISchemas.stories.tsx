import type { Meta, StoryObj } from "@storybook/react";
import { Schemas } from "../public/schemasSection";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Schemas",
  component: Schemas,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The schemas in an OpenAPI document. Each one is an expandable tree of its properties. The same `Schemas` component renders an AsyncAPI document too.",
      stories: "Default or Stacked",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      alone: alignedAlone("Schemas"),
      importNames: ["Schemas", "OpenAPIInfo", "OpenAPIProvider"],
      componentName: "Schemas",
      composedChildren: `  <OpenAPIInfo />
  <Schemas />`,
    }),
  },
} satisfies Meta<typeof Schemas>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the schemas line up with Info and Servers. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width. Use this when Schemas is the only section on the page. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
