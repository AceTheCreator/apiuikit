import type { Meta, StoryObj } from "@storybook/react";
import SchemaTab from "../components/schema/SchemaTab";
import rawExample from "../config/examples/example1.json";
import { buildDocumentContext } from "./documentContextDecorator";

// SchemaTab wraps a single schema in the Example / Schema / JSON toggle. It
// renders SchemaTree internally (which reads document context via
// useAsyncAPIDocument), so it needs the provider. "Example" is generated from
// the schema via json-schema-faker; "JSON" shows the raw definition.
const { decorator } = buildDocumentContext(rawExample);

const meta = {
  title: "Components/SchemaTab",
  component: SchemaTab,
  decorators: [decorator],
  tags: ["autodocs"],
} satisfies Meta<typeof SchemaTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Payload",
    schema: {
      type: "object",
      properties: {
        lumens: {
          type: "integer",
          minimum: 0,
          description: "Light intensity measured in lumens.",
        },
        sentAt: {
          type: "string",
          format: "date-time",
          description: "Date and time when the message was sent.",
        },
      },
      required: ["lumens"],
    },
  },
};

// A declared non-default format that failed to convert falls back to the raw
// definition, surfacing a conversion warning and hiding the Example tab.
export const ConversionError: Story = {
  args: {
    label: "Payload",
    schemaFormat: "application/vnd.google.protobuf;version=3",
    conversionError: "Unexpected token in protobuf source.",
    originalSchema: 'syntax = "proto3";\nmessage Point {\n  int32 lat = 1;\n}',
    schema: {},
  },
};
