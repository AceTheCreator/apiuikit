import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import QueryParameters from "../components/QueryParameters";
import { ChannelAddress } from "../components/ChannelAddress";
import MethodBadge from "../components/MethodBadge";
import { DocumentContext } from "../contexts";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import type { OpenAPIDocumentData } from "../types/openapi";

// QueryParameters is the `?N` chip in an endpoint panel's header. The popover
// portals to `portalHost`, so the decorator provides one; without it the chip
// still renders but the list can't open.
const withPortalHost = (Story: ComponentType) => (
  <DocumentContext.Provider
    value={{
      specType: "openapi",
      document: { openapi: "3.0.3", info: { title: "Petstore API", version: "1.0.0" } } as OpenAPIDocumentData,
      deref: () => undefined,
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
  </DocumentContext.Provider>
);

const meta = {
  title: "Internal/QueryParameters",
  tags: ["internal"],
  component: QueryParameters,
  decorators: [withPortalHost],
} satisfies Meta<typeof QueryParameters>;

export default meta;
type Story = StoryObj<typeof meta>;

const parameters = [
  { name: "limit", type: "integer", default: "20", description: "How many results to return per page." },
  { name: "cursor", type: "string", description: "Opaque cursor from a previous page's response." },
  { name: "order_by", type: "string", enum: ["asc", "desc"], default: "asc", required: true },
  { name: "expand", type: "array", description: "Relations to inline rather than reference by id." },
];

// The chip on its own — click it to open the list.
export const Default: Story = {
  args: { parameters },
};

// A single parameter still gets a chip rather than inline text, so the header's
// layout doesn't shift between neighboring operations.
export const SingleParameter: Story = {
  args: { parameters: [parameters[0]] },
};

// The header it actually lives in: the path takes the room and clips, the query
// parameters collapse beside it. This is the case that used to wrap onto a
// second line and shove the close button around.
export const InPanelHeader: Story = {
  args: { parameters },
  render: (args) => (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-5 py-4">
      <MethodBadge method="get" />
      <div className="min-w-0 flex-1 overflow-hidden">
        <ChannelAddress
          address="/v1/organizations/{org_id}/projects/{project_id}/branches/{branch_id}/compute/settings"
          parameters={{
            org_id: { description: "The organization's id.", type: "string" },
            project_id: { description: "The project's id.", type: "string" },
            branch_id: { description: "The branch's id.", type: "string" },
          }}
          truncate
          peek
          className="text-xs"
        />
      </div>
      <QueryParameters {...args} />
    </div>
  ),
};
