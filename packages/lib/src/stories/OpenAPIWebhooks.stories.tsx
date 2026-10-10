import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIWebhooks } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

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
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "A table of the webhooks an OpenAPI document receives. Each row is one webhook. Click a row to open a panel with its parameters, body, and responses. A document with no webhooks shows nothing here.",
      stories: "Default or Stacked",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      alone: alignedAlone("Webhooks"),
      importNames: ["OpenAPIWebhooks", "OpenAPIInfo", "OpenAPIProvider"],
      componentName: "OpenAPIWebhooks",
      composedChildren: `  <OpenAPIInfo />
  <OpenAPIWebhooks />`,
    }),
  },
} satisfies Meta<typeof OpenAPIWebhooks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the table lines up with Info and Servers. Click a row to open the detail panel. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width. Use this when Webhooks is the only section on the page. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
