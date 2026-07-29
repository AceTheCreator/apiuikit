import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import SchemaTree from "../components/schema/SchemaTree";
import { AsyncAPIDocumentContext } from "../contexts";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import example1 from "../config/examples/example1.json";
import example2 from "../config/examples/example2.json";

const mockDocument = {
  ...example1,
  components: {
    ...example1.components,
    schemas: {
      ...example1.components?.schemas,
      ...example2.components?.schemas,
      nodeA: { $ref: "#/components/schemas/nodeB" },
      nodeB: { $ref: "#/components/schemas/nodeA" },
    },
  },
};

const deref = (refPath: string): unknown => {
  const parts = refPath.replace(/^#\//, "").split("/");
  let current: unknown = mockDocument;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
    current = (current as Record<string, unknown>)[decoded];
    if (current == null) return undefined;
  }

  return current;
};

const withSchemaContext = (Story: ComponentType) => (
  <AsyncAPIDocumentContext.Provider
    value={{ document: mockDocument, deref, portalHost: null, rootElement: null, depthColors: DEFAULT_DEPTH_COLORS, showExtensions: true, showCodeSamples: true }}
  >
    <div className="mx-auto w-full max-w-3xl p-4">
      <Story />
    </div>
  </AsyncAPIDocumentContext.Provider>
);

const meta = {
  title: "Components/SchemaTree",
  component: SchemaTree,
  decorators: [withSchemaContext],
  tags: ["autodocs"],
} satisfies Meta<typeof SchemaTree>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NestedObject: Story = {
  args: {
    rootName: "corporateStructure",
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Legal entity name." },
        hqAddress: {
          type: "object",
          description: "Headquarters address.",
          properties: {
            street: { type: "string" },
            city: { type: "string" },
            zipCode: { type: "integer" },
          },
          required: ["street", "city"],
        },
        departments: {
          type: "array",
          description: "Company departments.",
          items: {
            type: "object",
            properties: {
              deptId: { type: "string" },
              headCount: { type: "number" },
            },
          },
        },
      },
      required: ["name"],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/departments\[\]/)).toBeInTheDocument();
    await expect(canvas.getByText(/departments\[\]\.deptId/)).toBeInTheDocument();
  },
};

export const RefChain: Story = {
  args: {
    rootName: "Payload",
    schema: {
      $ref: "#/components/schemas/lightMeasuredPayload",
    },
  },
};

export const OneOfComposite: Story = {
  args: {
    rootName: "subscriptionStatus",
    schema: example2.components?.schemas?.subscriptionStatus,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("One of:")).toBeInTheDocument();
    await expect(canvas.getByRole("tab", { name: "case 1" })).toBeInTheDocument();
    await expect(canvas.getByRole("tab", { name: "case 2" })).toBeInTheDocument();
    await expect(canvas.queryByText(/oneOf \(\d+\)/i)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/\.oneOf\[/)).not.toBeInTheDocument();
    await expect(canvas.queryByText(/Hide properties|Show properties/)).not.toBeInTheDocument();
    await expect(
      canvas.getByText(/subscriptionStatus\.errorMessage/)
    ).toBeInTheDocument();
  },
};

export const PropertyOneOf: Story = {
  args: {
    rootName: "BaseHeaders",
    schema: {
      type: "object",
      required: ["contentType"],
      properties: {
        contentType: {
          type: "string",
          const: "application/json",
        },
        "x-request-id": {
          oneOf: [
            {
              title: "UUID request id",
              type: "string",
              format: "uuid",
            },
            {
              title: "Prefixed request id",
              type: "string",
              pattern: "^req_[a-zA-Z0-9]+$",
            },
          ],
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/BaseHeaders\.x-request-id/)
    ).toBeInTheDocument();
    await expect(canvas.getByText(/one of \(2\)/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("tab", { name: "UUID request id" })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("tab", { name: "Prefixed request id" })
    ).toBeInTheDocument();
    await expect(canvas.getByText(/uuid/i)).toBeInTheDocument();

    const contentTypeRow = canvas.getByText(/BaseHeaders\.contentType/);
    const xRequestIdRow = canvas.getByText(/BaseHeaders\.x-request-id/);
    const oneOfLabel = canvas.getByText("One of:");
    expect(
      contentTypeRow.compareDocumentPosition(xRequestIdRow) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      xRequestIdRow.compareDocumentPosition(oneOfLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  },
};

export const PropertyAnyOf: Story = {
  args: {
    rootName: "BaseHeaders",
    schema: {
      type: "object",
      required: ["contentType"],
      properties: {
        contentType: {
          type: "string",
          const: "application/json",
        },
        "routing-key": {
          anyOf: [
            {
              title: "Critical routing",
              type: "string",
              const: "critical",
            },
            {
              title: "Tenant routing",
              type: "string",
              pattern: "^tenant\\.[a-z0-9-]+$",
            },
          ],
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/BaseHeaders\.routing-key/)
    ).toBeInTheDocument();
    await expect(canvas.getByText(/any of \(2\)/i)).toBeInTheDocument();
    await expect(
      canvas.getByRole("tab", { name: "Critical routing" })
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole("tab", { name: "Tenant routing" })
    ).toBeInTheDocument();
    await expect(canvas.getByText('"critical"')).toBeInTheDocument();
    await expect(canvas.queryByText(/\.anyOf\[/)).not.toBeInTheDocument();

    const contentTypeRow = canvas.getByText(/BaseHeaders\.contentType/);
    const routingKeyRow = canvas.getByText(/BaseHeaders\.routing-key/);
    const anyOfLabel = canvas.getByText("Any of:");
    expect(
      contentTypeRow.compareDocumentPosition(routingKeyRow) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      routingKeyRow.compareDocumentPosition(anyOfLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  },
};

export const AllOfComposite: Story = {
  args: {
    rootName: "subscriptionStatusError",
    schema: example2.components?.schemas?.subscriptionStatusError,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText(/allOf/i)).not.toBeInTheDocument();
    await expect(canvas.getByText(/subscriptionStatusError\.errorMessage/)).toBeInTheDocument();
    await expect(canvas.getByText(/subscriptionStatusError\.event/)).toBeInTheDocument();
    await expect(canvas.queryByText(/\.allOf\[/)).not.toBeInTheDocument();
  },
};

export const ArrayWithItems: Story = {
  args: {
    rootName: "pair",
    schema: example2.components?.schemas?.pair,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("pair[]")).toBeInTheDocument();
    await expect(canvas.getByText(/Array of string/)).toBeInTheDocument();
    await expect(canvas.queryByLabelText("Expand")).not.toBeInTheDocument();
  },
};

export const CircularRef: Story = {
  args: {
    rootName: "nodeA",
    schema: { $ref: "#/components/schemas/nodeA" },
  },
};

export const ConstraintsShowcase: Story = {
  args: {
    rootName: "Constraints",
    schema: {
      type: "object",
      properties: {
        multipleOfField: { type: "number", multipleOf: 0.01 },
        boundedNumber: {
          type: "integer",
          minimum: 0,
          exclusiveMinimum: 0,
          maximum: 100,
          exclusiveMaximum: 101,
        },
        boundedString: {
          type: "string",
          minLength: 1,
          maxLength: 255,
          pattern: "^[A-Z]+$",
        },
        boundedArray: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          uniqueItems: true,
          items: { type: "string" },
        },
        boundedObject: {
          type: "object",
          minProperties: 1,
          maxProperties: 5,
          properties: { id: { type: "string" } },
        },
        enumField: {
          type: "string",
          enum: ["on", "off", "pending"],
        },
        constField: {
          type: "string",
          const: "application/json",
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("multiple of")).toBeInTheDocument();
    await expect(canvas.getByText("0.01")).toBeInTheDocument();
    await expect(canvas.getByText("0")).toBeInTheDocument();
    await expect(canvas.getByText("boundedNumber")).toBeInTheDocument();
    await expect(canvas.getByText("101")).toBeInTheDocument();
    await expect(canvas.getAllByText("<").length).toBeGreaterThan(0);
    await expect(canvas.getByText("255")).toBeInTheDocument();
    await expect(canvas.getByText("pattern")).toBeInTheDocument();
    await expect(canvas.getByText("unique")).toBeInTheDocument();
    await expect(canvas.getByText("enum")).toBeInTheDocument();
    await expect(canvas.getByText('"on" | "off" | "pending"')).toBeInTheDocument();
    await expect(canvas.getByText('"application/json"')).toBeInTheDocument();
  },
};

export const ArrayItemConstraints: Story = {
  args: {
    rootName: "tags",
    schema: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "string",
        minLength: 3,
        maxLength: 100,
        pattern: "^[A-Z]+$",
        enum: ["Jr.", "Dr.", "Tester"],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("tags[]")).toBeInTheDocument();
    await expect(canvas.getByText(/Array of string/)).toBeInTheDocument();
    await expect(canvas.getByText("12")).toBeInTheDocument();
    await expect(canvas.getByText("item")).toBeInTheDocument();
    await expect(canvas.getByText("3")).toBeInTheDocument();
    await expect(canvas.getByText("100")).toBeInTheDocument();
    await expect(canvas.getByText("pattern")).toBeInTheDocument();
    await expect(canvas.getByText('"Jr." | "Dr." | "Tester"')).toBeInTheDocument();
  },
};

export const PropertyNot: Story = {
  args: {
    rootName: "payload",
    schema: {
      type: "object",
      properties: {
        disallowedValue: {
          not: {
            const: "forbidden",
          },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/payload\.disallowedValue/)
    ).toBeInTheDocument();
    await expect(canvas.getByText(/^not$/i)).toBeInTheDocument();
    await expect(canvas.getByText("Not:")).toBeInTheDocument();
    await expect(canvas.getByText('"forbidden"')).toBeInTheDocument();
    await expect(canvas.queryByText(/\.not\[/)).not.toBeInTheDocument();
  },
};

export const NotBooleanTrue: Story = {
  args: {
    rootName: "payload",
    schema: {
      type: "object",
      properties: {
        impossibleValue: {
          description: "Boolean false schema using not with true.",
          not: true,
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByText(/payload\.impossibleValue/)
    ).toBeInTheDocument();
    await expect(canvas.getByText(/^not$/i)).toBeInTheDocument();
    await expect(canvas.getByText("Not:")).toBeInTheDocument();
    await expect(canvas.getByText("any value")).toBeInTheDocument();
    await expect(
      canvas.getByText("Boolean false schema using not with true.")
    ).toBeInTheDocument();
    await expect(canvas.queryByText(/\.not\[/)).not.toBeInTheDocument();
  },
};

export const CombinedTypeAndNot: Story = {
  args: {
    rootName: "payload",
    schema: {
      type: "object",
      properties: {
        shortLabel: {
          type: "string",
          not: {
            maxLength: 3,
          },
        },
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/payload\.shortLabel/)).toBeInTheDocument();
    await expect(canvas.getByText(/^string$/i)).toBeInTheDocument();
    await expect(canvas.getByText("Not:")).toBeInTheDocument();
    await expect(canvas.getByText("3")).toBeInTheDocument();
    await expect(canvas.queryByText(/\.not\[/)).not.toBeInTheDocument();
  },
};
