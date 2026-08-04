import type { Meta, StoryObj } from "@storybook/react";
import { Messages } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

// The public `Messages` section: pass a `document` and it renders that
// document's messages table standalone. Each row expands independently to
// reveal its payload/headers.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "Components/Messages",
  component: Messages,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
} satisfies Meta<typeof Messages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document },
};
