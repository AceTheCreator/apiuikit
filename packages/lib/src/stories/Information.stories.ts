import type { Meta, StoryObj } from "@storybook/react";
import Information from "../containers/Information/Information";
import example from "../config/examples/example1.json";
import { centeredDecorator } from "./documentContextDecorator";

const meta = {
  title: "Internal/Information",
  component: Information,
  decorators: [centeredDecorator],
} satisfies Meta<typeof Information>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { ...example.info },
};
