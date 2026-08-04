import type { Meta, StoryObj } from "@storybook/react";
import Bindings from "../components/Bindings";
import { centeredDecorator } from "./documentContextDecorator";

// Bindings is a protocol-config disclosure (no document context). The
// `bindings` prop is the per-protocol object (the value under a protocol key,
// not the whole bindings map). `protocol` drives the label/badge styling.
// Values render by type: URLs become links, booleans/numbers are colored,
// nested objects indent recursively; the stories below cover a flat config
// and a nested one.
const meta = {
  title: "Internal/Bindings",
  component: Bindings,
  decorators: [centeredDecorator],
} satisfies Meta<typeof Bindings>;

export default meta;
type Story = StoryObj<typeof meta>;

// A Kafka server binding (schema registry), starts open via `expand`.
export const KafkaServer: Story = {
  args: {
    protocol: "kafka",
    expand: true,
    bindings: {
      bindingVersion: "0.5.0",
      schemaRegistryUrl: "https://schema-registry.mykafkacluster.org",
      schemaRegistryVendor: "confluent",
    },
  },
};

// A Kafka operation binding with nested object values (description blocks),
// exercising BindingValue's recursive rendering.
export const KafkaOperation: Story = {
  args: {
    protocol: "kafka",
    expand: true,
    bindings: {
      groupId: {
        type: "string",
        description:
          "The groupId must be prefixed by your service account, which needs write access to the topic.",
      },
      clientId: {
        type: "string",
        enum: ["my-app-consumer"],
      },
    },
  },
};

// Collapsed by default: click the header to expand.
export const Collapsed: Story = {
  args: {
    protocol: "kafka",
    bindings: {
      bindingVersion: "0.5.0",
      schemaRegistryUrl: "https://schema-registry.mykafkacluster.org",
      schemaRegistryVendor: "confluent",
    },
  },
};
