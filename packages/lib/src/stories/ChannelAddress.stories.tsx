import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ChannelAddress } from "../components/ChannelAddress";
import { AsyncAPIDocumentContext } from "../contexts";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import type { Parameter } from "../types/asyncapi/Parameter";
import type { AsyncAPIDocumentData } from "../types/schema";

// ChannelAddress renders a channel address, coloring each {parameter} segment
// and showing a hover/focus tooltip for parameters that have details
// (description, default, enum, examples). The tooltip is portaled to
// `portalHost`, so the decorator provides one (the story container); without
// it the address still renders but tooltips can't appear.
const withPortalHost = (Story: ComponentType) => {
  return (
    <AsyncAPIDocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: {} as AsyncAPIDocumentData,
        deref: () => undefined,
        // Tooltip portals need a real host; the canvas body works here.
        portalHost: typeof document !== "undefined" ? document.body : null,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
      }}
    >
      <div className="mx-auto w-full max-w-2xl p-8">
        <Story />
      </div>
    </AsyncAPIDocumentContext.Provider>
  );
};

const meta = {
  title: "Internal/ChannelAddress",
  component: ChannelAddress,
  decorators: [withPortalHost],
} satisfies Meta<typeof ChannelAddress>;

export default meta;
type Story = StoryObj<typeof meta>;

const parameters: Record<string, Parameter> = {
  streetlightId: {
    description: "The unique identifier of the streetlight.",
    examples: ["light-42"],
  } as Parameter,
  action: {
    description: "The command to perform.",
    enum: ["on", "off", "dim"],
    default: "on",
  } as Parameter,
};

// Address with parameterized segments: hover/focus a colored {param} to see
// its tooltip.
export const WithParameters: Story = {
  args: {
    address: "smartylighting/streetlights/{streetlightId}/command/{action}",
    parameters,
  },
};

// A plain address with no parameters.
export const Plain: Story = {
  args: {
    address: "smartylighting/streetlights/event/lighting/measured",
  },
};

// Truncated single-line variant (as used inside table rows).
export const Truncated: Story = {
  args: {
    address:
      "smartylighting/streetlights/{streetlightId}/command/{action}/with/a/very/long/trailing/path/segment",
    parameters,
    truncate: true,
  },
};
