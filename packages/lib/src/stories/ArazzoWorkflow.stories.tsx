import type { Meta, StoryObj } from "@storybook/react";
import { ArazzoInfo, ArazzoProvider, ArazzoWorkflowSection } from "../public/arazzoSections";
import { adoptionFlows, petstoreSource } from "./arazzoExamples";
import { centeredDecorator } from "./documentContextDecorator";
import { alignedAlone, itemDocs, layoutArgType } from "./sectionDocs";

const sources = { petstore: petstoreSource };

const meta = {
  title: "Arazzo/Workflow",
  component: ArazzoWorkflowSection,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: itemDocs({
      summary:
        "One workflow from an Arazzo document, picked by `workflowId`, for example on a page of its own. Links to other workflows only scroll when those are on the page too. Composed under `ArazzoProvider`, the document and its sources load once for every section inside.",
      spec: "Arazzo",
      provider: "ArazzoProvider",
      componentName: "ArazzoWorkflowSection",
      selector: 'workflowId="add-pet"',
      alone: alignedAlone("the workflow"),
      composedChildren: `  <p>Start by adding a pet.</p>
  <ArazzoWorkflowSection workflowId="add-pet" />`,
    }),
  },
} satisfies Meta<typeof ArazzoWorkflowSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { document: adoptionFlows, sources, workflowId: "add-pet" },
};

/** Your own content between sections, all sharing one resolved document under `ArazzoProvider`. */
export const Composed: Story = {
  args: { document: adoptionFlows, sources, workflowId: "add-and-remove" },
  render: ({ document, sources, workflowId }) => (
    <ArazzoProvider document={document!} sources={sources}>
      <ArazzoInfo />
      <div className="px-4 py-2 text-sm">
        <p>Cleaning up after a test run? This workflow adds a pet, then removes it.</p>
      </div>
      <ArazzoWorkflowSection workflowId={workflowId} />
    </ArazzoProvider>
  ),
};
