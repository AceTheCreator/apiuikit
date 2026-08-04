import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import SearchPanel from "../components/SearchPanel";
import { useSpecSearch } from "../hooks/useSpecSearch";
import type { AsyncAPIDocumentData } from "../types/schema";
import rawExample from "../config/examples/example1.json";
import { buildDocumentContext } from "./documentContextDecorator";
import { ComponentProps } from "react";

// SearchPanel is a controlled component (query/results in, selection out), but
// its toggle button + modal read portalHost/rootElement from
// AsyncAPIDocumentContext, so the story needs a real document context (not
// just the centered sizing wrapper). useSpecSearch supplies real query state +
// Fuse-ranked results from the example spec — type "server", "light", "kafka",
// etc. to see live matches.
const { document, decorator } = buildDocumentContext(rawExample as unknown as Record<string, unknown>);
const typedDocument = document as unknown as AsyncAPIDocumentData;

const meta = {
  title: "Internal/SearchPanel",
  component: SearchPanel,
  decorators: [decorator],
  // query/onQueryChange/results are supplied live by useSpecSearch in render
  // below; these defaults just satisfy the required-props story type.
  args: {
    query: "",
    onQueryChange: () => {},
    results: [],
    onSelectResult: fn(),
  },
} satisfies Meta<typeof SearchPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

const SearchHooks = (args: ComponentProps<typeof SearchPanel>) => {
  const { query, setQuery, results } = useSpecSearch(typedDocument);
  return (
    <SearchPanel
      {...args}
      query={query}
      onQueryChange={setQuery}
      results={results}
    />
  );
};

export const Default: Story = {
  render: (args) => <SearchHooks {...args} />,
};
