import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIRenderer } from "../containers/AsyncAPI/AsyncAPIRenderer";
import example1 from "../config/examples/streetlight.json";
import { widgetDocs } from "./sectionDocs";
import { tryItConfig, tryItNote } from "./tryItConfig";

const raw = JSON.stringify(example1);

const meta = {
  title: "AsyncAPI/AsyncAPIRenderer",
  component: AsyncAPIRenderer,
  tags: ["autodocs"],
  // Full-page widget, same as AsyncAPI: see noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      note: tryItNote("AsyncAPI"),
      summary:
        "The same full page as `AsyncAPI`, starting from the document as text. Pass `raw` a YAML or JSON string. Parser errors and warnings are handed to `onDiagnostics`. A document that fails to parse does not render a page.",
      stories: "Base, With Diagnostics Callback, or Invalid Document",
      code: `import { AsyncAPIRenderer } from "apiuikit";
import "apiuikit/style.css";

// raw is the AsyncAPI document as a YAML or JSON string.
<AsyncAPIRenderer raw={raw} config={{ show: { tryIt: true } }} />

// Parser errors and warnings.
<AsyncAPIRenderer
  raw={raw}
  onDiagnostics={(diagnostics) => console.log(diagnostics)}
/>`,
    }),
  },
} satisfies Meta<typeof AsyncAPIRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A valid document, parsed from a JSON string. */
export const Base: Story = {
  args: {
    config: tryItConfig,
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
    raw: JSON.stringify({ asyncapi: "3.0.0" }),
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};
