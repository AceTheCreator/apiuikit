import type { Meta, StoryObj } from "@storybook/react";
import OpenAPI from "../containers/OpenAPI/OpenAPI";
import type { OpenAPIDocumentData } from "../types/openapi";
import petstore from "../config/examples/openapi-petstore.json";
import { NoCanvasDocsPage } from "./noCanvasDocsPage";

const meta = {
  title: "OpenAPI/OpenAPI",
  component: OpenAPI,
  tags: ["autodocs"],
  // Full-page widget with a sidebar, search, and portaled content: doesn't
  // render correctly embedded inline on the docs page. See noCanvasDocsPage.
  parameters: { docs: { page: NoCanvasDocsPage } },
} satisfies Meta<typeof OpenAPI>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Base: Story = {
  args: {
    openapi: petstore as unknown as OpenAPIDocumentData,
  },
};
