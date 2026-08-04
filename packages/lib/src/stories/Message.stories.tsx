import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Message } from "../containers/Messages/Message";
import type { MessageObject } from "../types/asyncapi/MessageObject";
import rawExample from "../config/examples/example1.json";
import { buildDocumentContext } from "./documentContextDecorator";

const { document, decorator } = buildDocumentContext(rawExample);
const messages = (document.components as { messages?: Record<string, MessageObject> })
  ?.messages as Record<string, MessageObject>;
const [firstKey] = Object.entries(messages)[0];

const meta = {
  title: "Internal/Message",
  component: Message,
  decorators: [decorator],
} satisfies Meta<typeof Message>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
    message: {
      "name": "light",
      "title": "Light measured",
      "summary": "Inform about environmental lighting conditions of a particular streetlight.",
      "contentType": "application/json",

      "traits": [{
        "headers": {
          "type": "object",

          "properties": {
            "my-app-header": {
              "type": "integer",
              "minimum": 0,
              "maximum": 100
            },

            "correlationId": {
              "type": "string",
              "description": "Identifier used to correlate a command with its acknowledgement or reply."
            }
          }
        },

        "x-parser-schema-id": "commonHeaders"
      }],

      "correlationId": {
        "description": "Default correlation ID used to trace a command through to its acknowledgement or reply.",
        "location": "$message.header#/correlationId",
        "x-parser-schema-id": "default"
      },

      "payload": {
        "type": "object",

        "properties": {
          "lumens": {
            "type": "integer",
            "minimum": 0,
            "description": "Light intensity measured in lumens."
          },

          "sentAt": {
            "type": "string",
            "format": "date-time",
            "description": "Date and time when the message was sent.",
            "x-parser-schema-id": "sentAt"
          }
        },

        "x-parser-schema-id": "lightMeasuredPayload"
      },

      "x-parser-schema-id": "lightMeasured"
    } as unknown as MessageObject,
    messageId: firstKey,
    i: 0,
};

// The single-message card: header/summary/content-type badges plus the
// expandable payload & headers detail. Collapsed by default, matching how it
// renders inside the Messages table.
export const Default: Story = { args };

// `Message` owns its expanded state internally (no prop to force it), so the
// expanded variant drives the real UI: click "Show more" to reveal the
// payload/headers detail.
export const Expanded: Story = {
  args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", { name: /show more/i });
    await userEvent.click(toggle);
    await expect(
      canvas.getByRole("button", { name: /show less/i }),
    ).toBeInTheDocument();
  },
};
