import type { Meta, StoryObj } from "@storybook/react";
import { AsyncAPIServers } from "../public/sections";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";
import { layoutArgType, sectionDocs } from "./sectionDocs";

// The public `AsyncAPIServers` section: pass a `document` and it renders that
// document's servers standalone, resolving the doc and setting up its own
// context internally, no provider needed.
const document = rawExample as unknown as AsyncAPIDocumentData;

const oneServerDoc = {
  ...rawExample,
  servers: Object.fromEntries(Object.entries(rawExample.servers).slice(0, 1)),
} as unknown as AsyncAPIDocumentData;

const meta = {
  title: "AsyncAPI/Servers",
  component: AsyncAPIServers,
  decorators: [centeredDecorator],
  tags: ["autodocs"],
  argTypes: layoutArgType,
  parameters: {
    docs: sectionDocs({
      summary:
        "The servers an AsyncAPI document can connect to. Choose a server to see its host, protocol, variables, and security.",
      stories: "Default, Stacked, or Single Server",
      spec: "AsyncAPI",
      provider: "AsyncAPIProvider",
      alone:
        '`layout="columns"` (the default) puts the server list on the right. `layout="stacked"` places the list below the server detail.',
      importNames: ["AsyncAPIServers", "AsyncAPIOperations", "AsyncAPIProvider"],
      componentName: "AsyncAPIServers",
      composedChildren: `  <AsyncAPIServers />
  <AsyncAPIOperations />`,
    }),
  },
} satisfies Meta<typeof AsyncAPIServers>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Columns layout: the server list on the right. */
export const Default: Story = {
  args: { document, layout: "columns" },
};

/** Full width, with the server list below the server detail. */
export const Stacked: Story = {
  args: { document, layout: "stacked" },
};

/** A document with a single server. */
export const SingleServer: Story = {
  args: { document: oneServerDoc, layout: "columns" },
};
