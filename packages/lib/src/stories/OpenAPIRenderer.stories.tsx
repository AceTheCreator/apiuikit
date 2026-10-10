import type { Meta, StoryObj } from "@storybook/react";
import { OpenAPIRenderer } from "../containers/OpenAPI/OpenAPIRenderer";
import petstore from "../config/examples/openapi-petstore.json";
import { widgetDocs } from "./sectionDocs";

const raw = JSON.stringify(petstore);

const meta = {
  title: "OpenAPI/OpenAPIRenderer",
  component: OpenAPIRenderer,
  tags: ["autodocs"],
  // Full-page widget, same as OpenAPI: see noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      summary:
        "The same full page as `OpenAPI`, starting from the document as text. Pass `raw` a YAML or JSON string. Parser errors and warnings are handed to `onDiagnostics`. A document that fails to parse does not render a page.",
      stories: "Base, With Diagnostics Callback, or Invalid Document",
      code: `import { OpenAPIRenderer } from "apiuikit";
import "apiuikit/style.css";

// raw is the OpenAPI document as a YAML or JSON string.
<OpenAPIRenderer raw={raw} />

// Parser errors and warnings.
<OpenAPIRenderer
  raw={raw}
  onDiagnostics={(diagnostics) => console.log(diagnostics)}
/>`,
    }),
  },
} satisfies Meta<typeof OpenAPIRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A valid document, parsed from a JSON string. */
export const Base: Story = {
  args: {
    raw,
  },
};

/** Logs parser errors and warnings after the document is parsed. */
export const WithDiagnosticsCallback: Story = {
  args: {
    raw,
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

/** A document that fails to parse. The page stays empty, and the diagnostics are logged. */
export const InvalidDocument: Story = {
  args: {
    raw: JSON.stringify({ openapi: "3.0.3" }),
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};
