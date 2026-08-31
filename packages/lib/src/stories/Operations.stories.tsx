import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIOperations } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

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
  argTypes: {
    layout: {
      control: "radio",
      options: ["columns", "stacked"],
      description:
        '`"columns"` (default) reserves a right gutter for alignment with Info/Servers. `"stacked"` drops it for full-width standalone use.',
    },
  },
  // The table + detail side panel don't render correctly embedded inline on
  // the docs page, see noCanvasDocsPage.
  parameters: { docs: { page: NoCanvasDocsPage } },
} satisfies Meta<typeof AsyncAPIOperations>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default: two-column geometry with an empty reserved right gutter. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Single column — preferred when embedding AsyncAPIOperations alone (no empty side space). */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};
