import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIRenderer } from "../containers/OpenAPI/OpenAPIRenderer";
import petstore from "../config/examples/openapi-petstore.json";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

const raw = JSON.stringify(petstore);

const meta = {
  title: "OpenAPI/OpenAPIRenderer",
  component: OpenAPIRenderer,
  tags: ["autodocs"],
  // Full-page widget, same as OpenAPI: see noCanvasDocsPage.
  parameters: { docs: { page: NoCanvasDocsPage } },
} satisfies Meta<typeof OpenAPIRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Base: Story = {
  args: {
    raw,
  },
};

export const WithDiagnosticsCallback: Story = {
  args: {
    raw,
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

export const InvalidDocument: Story = {
  args: {
    raw: JSON.stringify({ openapi: "3.0.3" }),
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};
