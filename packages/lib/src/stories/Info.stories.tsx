import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIInfo } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { layoutArgType, sectionDocs } from "./sectionDocs";

// Public `AsyncAPIInfo` section — title, description, and metadata (license/contact)
// in the side column by default.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Info",
  component: AsyncAPIInfo,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The title, description, and version of an AsyncAPI document, with license, contact, and external docs beside it.",
      stories: "Default or Stacked",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      alone:
        '`layout="columns"` (the default) puts license, contact, and external docs on the right. `layout="stacked"` places them below the description.',
      importNames: ["AsyncAPIInfo", "AsyncAPIOperations", "AsyncAPIProvider"],
      componentName: "AsyncAPIInfo",
      composedChildren: `  <AsyncAPIInfo />
  <AsyncAPIOperations />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: license, contact, and external docs on the right. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width, with license, contact, and external docs below the description. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
