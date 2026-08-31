import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIWebhooks } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import { centeredDecorator } from "./documentContextDecorator";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

const document = {
  openapi: "3.1.0",
  info: { title: "Webhooks demo", version: "1.0.0" },
  webhooks: {
    newPet: {
      post: {
        summary: "New pet added",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Pet" },
            },
          },
        },
        responses: { "200": { description: "OK" } },
      },
    },
  },
  components: {
    schemas: {
      Pet: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
      },
    },
  },
} as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Webhooks",
  component: OpenAPIWebhooks,
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
} satisfies Meta<typeof OpenAPIWebhooks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, layout: "columns" },
};

export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
