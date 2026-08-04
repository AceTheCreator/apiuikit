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
  title: "Components/Servers",
  component: Servers,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
} satisfies Meta<typeof Servers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document },
};

export const SingleServer: Story = {
  args: { document: oneServerDoc },
};
