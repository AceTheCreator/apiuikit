import type { Meta, StoryObj } from "@storybook/react";
import { Info } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

// Public `Info` section — title, description, and metadata (license/contact)
// in the side column by default.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Info",
  component: Info,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "radio",
      options: ["columns", "stacked"],
      description:
        '`"columns"` (default) puts license/contact metadata on the right. `"stacked"` places it below the description.',
    },
  },
} satisfies Meta<typeof Info>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
