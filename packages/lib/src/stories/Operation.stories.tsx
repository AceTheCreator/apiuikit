import type { Meta, StoryObj } from "@storybook/react";
import Operation from "../containers/Operation/Operation";
import type { Operation as OperationType } from "../types/asyncapi/Operation";
import rawExample from "../config/examples/example1.json";
import { buildDocumentContext } from "./documentContextDecorator";

const { document, decorator } = buildDocumentContext(rawExample);
const operations = document.operations as unknown as Record<string, OperationType>;
const [firstKey, firstOperation] = Object.entries(operations)[0];

const meta = {
  title: "Internal/Operation",
  component: Operation,
  decorators: [decorator],
} satisfies Meta<typeof Operation>;

export default meta;
type Story = StoryObj<typeof meta>;

// The single-operation detail view (what the Operations table opens in its
// side panel): description, authorization, bindings, and message payloads.
export const Default: Story = {
  args: {
    op: firstOperation,
    id: firstKey,
  },
};
