import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIMessages } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

// The public `AsyncAPIMessages` section: pass a `document` and it renders that
// document's messages table standalone. Each row expands independently to
// reveal its payload/headers.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Messages",
  component: AsyncAPIMessages,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "A table of the messages in an AsyncAPI document. Each row shows the message name and summary. Expand a row to see its payload and headers.",
      stories: "Default or Stacked",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      alone: alignedAlone("Messages"),
      importNames: ["AsyncAPIMessages", "AsyncAPIInfo", "AsyncAPIProvider"],
      componentName: "AsyncAPIMessages",
      composedChildren: `  <AsyncAPIInfo />
  <AsyncAPIMessages />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the table lines up with Info and Servers. Expand a row to see the payload and headers. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width. Use this when Messages is the only section on the page. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
