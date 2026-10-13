import type { Meta, StoryObj } from "@storybook/react";
import { Schema } from "../public/schemasSection";
import type { OpenAPIDocumentData } from "../types/openapi";
import type { AsyncAPIDocumentData } from "../types/schema";
import openapiExample from "../config/examples/openapi-petstore.json";
import asyncapiExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { itemDocs, itemLayoutArgType } from "./sectionDocs";

const meta = {
  title: "Shared/Schema",
  component: Schema,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: itemLayoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One schema from `components.schemas`, as an expandable tree of its properties. The same component works for AsyncAPI and OpenAPI documents. Pick it by `name`.",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      componentName: "Schema",
      selector: 'name="Pet"',
      composedChildren: `  <p>A pet looks like this:</p>
  <Schema name="Pet" />`,
    }),
  },
} satisfies Meta<typeof Schema>;

export default meta;
type Story = StoryObj<typeof meta>;

/** From an OpenAPI document. */
export const Default: Story = {
  args: { document: openapiExample as unknown as OpenAPIDocumentData, name: "Pet" },
};

/** From an AsyncAPI document. */
export const FromAsyncAPI: Story = {
  args: { document: asyncapiExample as unknown as AsyncAPIDocumentData, name: "lightMeasuredPayload" },
};
