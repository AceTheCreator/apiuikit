import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIMessages } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

// The public `AsyncAPIMessages` section: pass a `document` and it renders that
// document's messages table standalone. Each row expands independently to
// reveal its payload/headers.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Messages",
  component: AsyncAPIMessages,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "radio",
      options: ["columns", "stacked"],
      description:
        '`"columns"` (default) reserves a right gutter. `"stacked"` drops it for full-width standalone use.',
    },
  },
} satisfies Meta<typeof AsyncAPIMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
