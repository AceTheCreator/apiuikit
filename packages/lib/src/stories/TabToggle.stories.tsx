import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";
import TabToggle from "../components/TabToggle";
import { centeredDecorator } from "./documentContextDecorator";

// TabToggle is a compact segmented control (used by SchemaTab for
// Schema/Example/JSON). Controlled, with roving-tabindex keyboard nav. The
// story owns `selected` to make switching interactive.
const meta = {
  title: "Internal/TabToggle",
  component: TabToggle,
  decorators: [centeredDecorator],
} satisfies Meta<typeof TabToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

const tabs = [
  { id: "example", label: "Example" },
  { id: "schema", label: "Schema" },
  { id: "json", label: "JSON" },
];

const TabToggleHooks = (args: ComponentProps<typeof TabToggle>) => {
  const [selected, setSelected] = useState(tabs[0].id);
  return <TabToggle {...args} selected={selected} onChange={setSelected} />;
};

export const Default: Story = {
  args: {
    tabs,
    selected: tabs[0].id, // overridden by render's state
    onChange: () => {}, // overridden by render
    ariaLabel: "Schema view",
  },
  render: (args) => <TabToggleHooks {...args} />,
};
