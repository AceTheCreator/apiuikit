import type { Meta, StoryObj } from "@storybook/react";
import { Schemas } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

// Public `Schemas` section — components.schemas as expandable trees.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Schemas",
  component: Schemas,
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
} satisfies Meta<typeof Schemas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
