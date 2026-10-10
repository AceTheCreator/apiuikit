import { ArgTypes, Description, Heading, Source, Subtitle, Title, useOf } from "@storybook/blocks";

/**
 * A docs page with no live component canvas, just the description and prop
 * table. Default autodocs embeds every story's canvas inline, sharing one DOM
 * across the whole page: fine for a self-contained component, but this
 * library's full-page widgets and portal/fixed-id-based components (search
 * highlighting, side panels) don't render correctly when multiple instances
 * share a page. Use this for those; leave default autodocs for the rest.
 *
 * Without a canvas there's no "Show code" button, so a hand-written usage
 * snippet is shown directly when the story sets `parameters.docs.source.code`.
 * The generated snippet is skipped: it would inline the whole example document
 * as a JSX prop.
 */
export const NoCanvasDocsPage = () => {
  const resolved = useOf("meta", ["meta"]);
  const source = resolved.preparedMeta.parameters.docs?.source;
  const code = source && typeof source === "object" && "code" in source ? source.code : undefined;

  return (
    <>
      <Title />
      <Subtitle />
      <Description />
      {typeof code === "string" && code.length > 0 ? (
        <>
          <Heading>Usage</Heading>
          <Source />
        </>
      ) : null}
      <Heading>Props</Heading>
      <ArgTypes />
    </>
  );
};
