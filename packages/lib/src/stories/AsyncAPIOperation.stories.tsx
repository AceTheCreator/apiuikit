import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIOperation } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { wsEchoDocument } from "./wsEchoDocument";
import { itemDocs, itemLayoutArgType } from "./sectionDocs";
import { tryItConfig } from "./tryItConfig";

const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Operation",
  component: AsyncAPIOperation,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: itemLayoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One operation from an AsyncAPI document, shown inline: its action and channel, then its messages, bindings, and security. Pick it by its key under `operations`.",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      componentName: "AsyncAPIOperation",
      tryIt: true,
      selector: 'operationId="receiveLightMeasurement"',
      composedChildren: `  <h2>Listening for measurements</h2>
  <AsyncAPIOperation operationId="receiveLightMeasurement" />
  <h2>Dimming a light</h2>
  <AsyncAPIOperation operationId="dimLight" />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIOperation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document, operationId: "receiveLightMeasurement" },
};

/**
 * Try it turned on with `config={{ show: { tryIt: true } }}`. The AsyncAPI
 * button is a WebSocket client, so it only appears for operations with a
 * `ws`/`wss` server; this story uses a small echo document for that reason.
 */
export const WithTryIt: Story = {
  args: { document: wsEchoDocument, operationId: "sendGreeting", config: tryItConfig },
};
