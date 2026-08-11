import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIEndpoints } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "Components/OpenAPIEndpoints",
  component: OpenAPIEndpoints,
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
  parameters: { docs: { page: NoCanvasDocsPage } },
} satisfies Meta<typeof OpenAPIEndpoints>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
