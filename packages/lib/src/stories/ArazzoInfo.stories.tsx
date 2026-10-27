import type { Meta, StoryObj } from "@storybook/react";
import { ArazzoInfo } from "../public/arazzoSections";
import { adoptionFlows, petstoreSource } from "./arazzoExamples";
import { centeredDecorator } from "./documentContextDecorator";
import { layoutArgType, sectionDocs } from "./sectionDocs";

const sources = { petstore: petstoreSource };

const meta = {
  title: "Arazzo/Info",
  component: ArazzoInfo,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The title and description of an Arazzo document, with a chip per source description saying whether it could be loaded. It renders nothing until the document and its sources have resolved.",
      stories: "Default or Stacked",
      spec: "Arazzo",
      provider: "ArazzoProvider",
      alone:
        '`layout="columns"` (the default) puts the sources on the right. `layout="stacked"` places them below the description.',
      importNames: ["ArazzoInfo", "ArazzoWorkflows", "ArazzoProvider"],
      componentName: "ArazzoInfo",
      composedChildren: `  <ArazzoInfo />
  <ArazzoWorkflows />`,
    }),
  },
} satisfies Meta<typeof ArazzoInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: the sources on the right. */
export const Default: Story = {
  args: { document: adoptionFlows, sources, layout: "columns" },
};

/** Full width, with the sources below the description. */
export const Stacked: Story = {
  args: { document: adoptionFlows, sources, layout: "stacked" },
};
