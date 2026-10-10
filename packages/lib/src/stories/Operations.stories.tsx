import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIOperations } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

// The public `AsyncAPIOperations` section: pass a `document` and it renders that
// document's operations table standalone. Clicking a row opens the detail
// side panel; the wrapper owns that selection state internally, so selection
// isn't a prop of the public API.
const document = rawExample as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Operations",
  component: AsyncAPIOperations,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  // The table + detail side panel don't render correctly embedded inline on
  // the docs page, see noCanvasDocsPage.
  parameters: {
    docs: sectionDocs({
      summary:
        "Each row is one operation: its channel, and whether it sends or receives. Click a row to open a panel with the description, messages, security, bindings, and reply.",
      stories: "Default or Stacked",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      alone: alignedAlone("Operations"),
      importNames: ["AsyncAPIOperations", "AsyncAPIInfo", "AsyncAPIProvider"],
      componentName: "AsyncAPIOperations",
      composedChildren: `  <AsyncAPIInfo />
  <AsyncAPIOperations />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIOperations>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the table lines up with Info and Servers. Click a row to open the detail panel. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width. Use this when Operations is the only section on the page. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
