import { ArgTypes, Description, Subtitle, Title } from "@storybook/blocks";

/**
 * A docs page with no live component canvas, just the description and prop
 * table. Default autodocs embeds every story's canvas inline, sharing one DOM
 * across the whole page: fine for a self-contained component, but this
 * library's full-page widgets and portal/fixed-id-based components (search
 * highlighting, side panels) don't render correctly when multiple instances
 * share a page. Use this for those; leave default autodocs for the rest.
 */
export const NoCanvasDocsPage = () => (
  <>
    <Title />
    <Subtitle />
    <Description />
    <ArgTypes />
  </>
);
