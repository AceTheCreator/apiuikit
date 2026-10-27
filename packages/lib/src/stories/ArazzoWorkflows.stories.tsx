import type { Meta, StoryObj } from "@storybook/react";
import { ArazzoWorkflows } from "../public/arazzoSections";
import { adoptionFlows, petstoreSource } from "./arazzoExamples";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, layoutArgType, sectionDocs } from "./sectionDocs";

const sources = { petstore: petstoreSource };

const meta = {
  title: "Arazzo/Workflows",
  component: ArazzoWorkflows,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "Every workflow in an Arazzo document: a list at a glance, then each workflow in full, with its inputs, steps (each embedding the OpenAPI operation it calls), success criteria, actions and outputs. It renders nothing until the document and its sources have resolved.",
      stories: "Default or Stacked",
      spec: "Arazzo",
      provider: "ArazzoProvider",
      alone: alignedAlone("Workflows"),
      importNames: ["ArazzoWorkflows", "ArazzoInfo", "ArazzoProvider"],
      componentName: "ArazzoWorkflows",
      composedChildren: `  <ArazzoInfo />
  <ArazzoWorkflows />`,
    }),
  },
} satisfies Meta<typeof ArazzoWorkflows>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: an empty column on the right, so the workflows line up with Info. */
export const Default: Story = {
  args: { document: adoptionFlows, sources, layout: "columns" },
};

/** Full width. Use this when Workflows is the only section on the page. */
export const Stacked: Story = {
  args: { document: adoptionFlows, sources, layout: "stacked" },
};
