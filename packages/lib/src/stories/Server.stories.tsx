import type { Meta, StoryObj } from "@storybook/react";
import { Servers } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

// The public `Servers` section: pass a `document` and it renders that
// document's servers standalone, resolving the doc and setting up its own
// context internally, no provider needed.
const document = rawExample as unknown as AsyncAPIDocumentData;

const oneServerDoc = {
  ...rawExample,
  servers: Object.fromEntries(Object.entries(rawExample.servers).slice(0, 1)),
} as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Servers",
  component: Servers,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "radio",
      options: ["columns", "stacked"],
      description:
        '`"columns"` (default) puts the server list nav in the right column. `"stacked"` places it below the server detail.',
    },
  },
} satisfies Meta<typeof Servers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};

export const SingleServer: Story = {
  args: { document: oneServerDoc, layout: "columns" },
};
