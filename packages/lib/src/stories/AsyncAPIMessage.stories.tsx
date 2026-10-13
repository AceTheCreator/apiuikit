import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIMessage } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { itemDocs, itemLayoutArgType } from "./sectionDocs";

const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Message",
  component: AsyncAPIMessage,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: itemLayoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One message from an AsyncAPI document's `components.messages`, with its payload and headers already open. Pick it by its key.",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      componentName: "AsyncAPIMessage",
      selector: 'messageId="lightMeasured"',
      composedChildren: `  <p>Each measurement arrives as:</p>
  <AsyncAPIMessage messageId="lightMeasured" />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, messageId: "lightMeasured" },
};
