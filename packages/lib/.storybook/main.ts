import { fileURLToPath } from "node:url";
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
  // Same aliases as vitest.config.ts, for the same reason: stories render this
  // library from `src`, but the built-in try-it packages import
  // `apiuikit/plugin`, which otherwise resolves to the *built* `dist` — missing
  // entirely on a clean checkout (CI only runs `storybook build`), and a second
  // `DocumentContext` when present. Exact-match regexes, so the bare `apiuikit`
  // entry can't swallow `apiuikit/plugin` regardless of order.
  viteFinal: async (viteConfig) => {
    const { mergeConfig } = await import("vite");
    return mergeConfig(viteConfig, {
      resolve: {
        alias: [
          { find: /^apiuikit\/plugin$/, replacement: fileURLToPath(new URL("../src/plugin.ts", import.meta.url)) },
          { find: /^apiuikit$/, replacement: fileURLToPath(new URL("../src/index.ts", import.meta.url)) },
        ],
      },
    });
  },
};
export default config;
