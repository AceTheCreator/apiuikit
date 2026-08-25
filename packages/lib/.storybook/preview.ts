import type { Preview } from "@storybook/react";
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: (a, b) => {
        const roots = ["Introduction", "AsyncAPI", "OpenAPI", "Shared"];
        const asyncapi = [
          "AsyncAPI",
          "AsyncAPIRenderer",
          "Info",
          "Messages",
          "Operations",
          "Schemas",
          "Servers",
        ];
        const openapi = [
          "OpenAPI",
          "OpenAPIRenderer",
          "Endpoints",
          "Info",
          "Schemas",
          "Servers",
          "Webhooks",
        ];

        const aRoot = a.title.split("/")[0] ?? "";
        const bRoot = b.title.split("/")[0] ?? "";
        const rootDelta =
          (roots.indexOf(aRoot) === -1 ? 99 : roots.indexOf(aRoot)) -
          (roots.indexOf(bRoot) === -1 ? 99 : roots.indexOf(bRoot));
        if (rootDelta !== 0) return rootDelta;

        const children =
          aRoot === "AsyncAPI" ? asyncapi : aRoot === "OpenAPI" ? openapi : [];
        if (children.length === 0) return a.title.localeCompare(b.title);

        const aChild = a.title.split("/")[1] ?? "";
        const bChild = b.title.split("/")[1] ?? "";
        return (
          (children.indexOf(aChild) === -1 ? 99 : children.indexOf(aChild)) -
          (children.indexOf(bChild) === -1 ? 99 : children.indexOf(bChild))
        );
      },
    },
  },
};

export default preview;
