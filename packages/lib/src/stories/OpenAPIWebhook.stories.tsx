import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIWebhook } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import { centeredDecorator } from "./documentContextDecorator";
import { itemDocs, itemLayoutArgType } from "./sectionDocs";

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
  title: "OpenAPI/Webhook",
  component: OpenAPIWebhook,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: itemLayoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One webhook from an OpenAPI 3.1 document, shown inline. Pick it by `name`; `method` is only needed when the webhook declares more than one.",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      componentName: "OpenAPIWebhook",
      selector: 'name="newPet"',
      composedChildren: `  <p>We call you when a pet is added:</p>
  <OpenAPIWebhook name="newPet" />`,
    }),
  },
} satisfies Meta<typeof OpenAPIWebhook>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, name: "newPet" },
};
