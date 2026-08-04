import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-onboarding",
    "@storybook/addon-essentials",
    "@chromatic-com/storybook",
    "@storybook/addon-interactions",
    "@storybook/addon-a11y",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Generate prop tables from TypeScript types (and their TSDoc comments)
  // instead of runtime prop inspection, picking up the /** ... */ comments
  // already on the public prop interfaces. Note: union-typed props (e.g. a
  // component accepting `A | B`) don't produce a usable table this way, so
  // prefer a flat interface with optional fields for anything storied.
  typescript: {
    reactDocgen: "react-docgen-typescript",
  },
};
export default config;
