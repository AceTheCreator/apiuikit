import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIEndpoint } from "../public/openapiSections";
import type { OpenAPIDocumentData } from "../types/openapi";
import rawExample from "../config/examples/openapi-petstore.json";
import { centeredDecorator } from "./documentContextDecorator";
import { itemDocs, itemLayoutArgType } from "./sectionDocs";
import { tryItConfig } from "./tryItConfig";

const document = rawExample as unknown as OpenAPIDocumentData;

const meta = {
  title: "OpenAPI/Endpoint",
  component: OpenAPIEndpoint,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: itemLayoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One endpoint from an OpenAPI document, shown inline: its method and path, then the parameters, request body, responses, and security. Pick it by `operationId`, or by `method` and `path`.",
      spec: "OpenAPI",
      provider: "OpenAPIProvider",
      componentName: "OpenAPIEndpoint",
      tryIt: true,
      selector: 'operationId="createPet"',
      composedChildren: `  <h2>Adding a pet</h2>
  <OpenAPIEndpoint operationId="createPet" />
  <h2>Fetching it back</h2>
  <OpenAPIEndpoint method="get" path="/pets/{petId}" />`,
    }),
  },
} satisfies Meta<typeof OpenAPIEndpoint>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Picked by `operationId`. */
export const Default: Story = {
  args: { document, operationId: "createPet" },
};

/** Picked by `method` and `path`. */
export const ByMethodAndPath: Story = {
  args: { document, method: "get", path: "/pets/{petId}" },
};

/**
 * Try it turned on with `config={{ show: { tryIt: true } }}`. It's off by
 * default: when on, readers' requests (and any credentials they enter) go to
 * the document's servers, so the host app opts in.
 */
export const WithTryIt: Story = {
  args: { document, operationId: "createPet", config: tryItConfig },
};
