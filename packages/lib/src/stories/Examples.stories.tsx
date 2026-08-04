import type { Meta, StoryObj } from "@storybook/react";
import { Examples } from "../components/Examples";
import { centeredDecorator } from "./documentContextDecorator";

// Examples generates a sample payload from a JSON schema via json-schema-faker
// (seeded, so output is stable) and renders it as a copyable JSON block. No
// document context needed. Circular/ungenerable schemas fail soft to an empty
// block rather than throwing.
const meta = {
  title: "Internal/Examples",
  component: Examples,
  decorators: [centeredDecorator],
} satisfies Meta<typeof Examples>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        lumens: {
          type: "integer",
          minimum: 0,
          description: "Light intensity measured in lumens.",
        },
        sentAt: { type: "string", format: "date-time" },
        location: {
          type: "object",
          properties: {
            lat: { type: "number" },
            lon: { type: "number" },
          },
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["id", "lumens"],
    },
  },
};

export const WithEnumAndExamples: Story = {
  args: {
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["on", "off", "dimmed"] },
        command: { type: "string", examples: ["turnOn"] },
        level: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["status"],
    },
  },
};
