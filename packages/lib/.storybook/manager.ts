import { addons } from "@storybook/manager-api";

addons.setConfig({
  sidebar: {
    filters: {
      // Building-block stories stay in the index (Chromatic, direct URLs)
      // but are not part of the public catalog.
      patterns: (item) =>
        !item.tags?.includes("internal") &&
        item.id !== "internal" &&
        !item.id.startsWith("internal-"),
    },
  },
});
