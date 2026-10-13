import type { Meta, StoryObj } from "@storybook/react";
import { Schemas } from "../public/schemasSection";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

// Public `Schemas` section (spec-agnostic) — components.schemas as expandable trees.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Schemas",
  component: Schemas,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The schemas in an AsyncAPI document. Each one is an expandable tree of its properties. The same `Schemas` component renders an OpenAPI document too.",
      stories: "Default or Stacked",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      alone: alignedAlone("Schemas"),
      importNames: ["Schemas", "AsyncAPIInfo", "AsyncAPIProvider"],
      componentName: "Schemas",
      composedChildren: `  <AsyncAPIInfo />
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
