import type { Meta, StoryObj } from "@storybook/react";
import AsyncAPI from "../containers/AsyncAPI/AsyncAPI";
import type { AsyncAPIDocumentData } from "../types/schema";
import torture from "../config/examples/streetlight-kafka.json";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Components/AsyncAPI",
  component: AsyncAPI,
  tags: ["autodocs"],
  // Full-page widget with a sidebar, search, and portaled content: doesn't
  // render correctly embedded inline on the docs page. See noCanvasDocsPage.
  parameters: { docs: { page: NoCanvasDocsPage } },
  //   parameters: {
  //     // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
  //     layout: "centered",
  //   },
  //   argTypes: {
  //     backgroundColor: { control: "color" },
  //   },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
} satisfies Meta<typeof AsyncAPI>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Base: Story = {
  args: {
    asyncapi: torture as unknown as AsyncAPIDocumentData,
  },
};

