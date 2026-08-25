import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIServers } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Servers",
  component: OpenAPIServers,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "radio",
      options: ["columns", "stacked"],
      description:
        '`"columns"` (default) puts the server list nav on the right. `"stacked"` places it below the server detail.',
    },
  },
} satisfies Meta<typeof OpenAPIServers>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
