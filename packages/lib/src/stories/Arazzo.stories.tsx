import type { Meta, StoryObj } from "@storybook/react";
import Arazzo from "../containers/Arazzo/Arazzo";
import { widgetDocs } from "./sectionDocs";
import { actionFlows, adoptionFlows, dataFlowFlows, petstoreSource, unresolvedSourceFlows } from "./arazzoExamples";

const meta = {
  title: "Arazzo/Arazzo",
  component: Arazzo,
  tags: ["autodocs"],
  // Full-page widget, same as OpenAPI: see noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      summary:
        "A full Arazzo documentation page: each workflow's inputs, numbered steps, success criteria, actions and outputs. Every step embeds the OpenAPI operation it calls, collapsed until opened. Pass `arazzo` the parsed document and `sources` the parsed source documents, keyed by each source description's `name`. Sources you leave out are loaded from their `url` (relative ones only with `baseUrl`), or through your own `loadSource`.",
      stories: "Base, Every Action Type, Step Calls A Workflow, Data Flow, or Unresolved Source",
      code: `import { Arazzo } from "apiuikit";
import "apiuikit/style.css";

<Arazzo arazzo={arazzoDocument} sources={{ petstore: petstoreDocument }} />`,
    }),
  },
} satisfies Meta<typeof Arazzo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two workflows calling the Petstore API, one depending on the other. */
export const Base: Story = {
  args: {
    arazzo: adoptionFlows,
    sources: { petstore: petstoreSource },
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

/** goto a step, goto a workflow, retry and end, on success and on failure, plus one from `components`. */
export const EveryActionType: Story = {
  args: {
    arazzo: actionFlows,
    sources: { petstore: petstoreSource },
  },
};

/** The "add" step runs another workflow in the same document; its link jumps there. */
export const StepCallsAWorkflow: Story = {
  args: {
    arazzo: adoptionFlows,
    sources: { petstore: petstoreSource },
    initialLocation: { tab: "workflows", key: "add-and-remove/add" },
  },
};

/**
 * Expressions as chips: inputs tinted one way, step and workflow outputs
 * another. Point at one (hover or keyboard focus) to light up the step that
 * produces the value and every step that reads it; click it to go there. Each
 * output lists the steps that use it. One reference is broken on purpose.
 */
export const DataFlow: Story = {
  args: {
    arazzo: dataFlowFlows,
    sources: { petstore: petstoreSource },
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

/** The `payments` source isn't supplied and can't be fetched: its steps say so, and the rest of the page renders. */
export const UnresolvedSource: Story = {
  args: {
    arazzo: unresolvedSourceFlows,
    sources: { petstore: petstoreSource },
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

/** Dark mode, with the data flow example's chips. */
export const Dark: Story = {
  args: {
    arazzo: dataFlowFlows,
    sources: { petstore: petstoreSource },
    config: { theme: { mode: "dark" } },
  },
};
