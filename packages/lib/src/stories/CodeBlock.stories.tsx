import type { Meta, StoryObj } from "@storybook/react";
import { CodeBlock } from "../components/CodeBlock";
import { centeredDecorator } from "./documentContextDecorator";

// CodeBlock renders JSON with highlight.js syntax highlighting and a
// copy-to-clipboard button. No document context needed. The input is a code
// string (callers stringify their own JSON).
const meta = {
  title: "Internal/CodeBlock",
  component: CodeBlock,
  decorators: [centeredDecorator],
} satisfies Meta<typeof CodeBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: JSON.stringify(
      {
        id: "light-42",
        lumens: 700,
        sentAt: "2024-01-15T09:30:00Z",
        location: { lat: 51.5, lon: -0.09 },
        tags: ["outdoor", "led"],
      },
      null,
      2,
    ),
  },
};

export const ShortSnippet: Story = {
  args: {
    code: JSON.stringify({ status: "on", level: 80 }, null, 2),
  },
};
