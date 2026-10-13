import { NoCanvasDocsPage } from "./noCanvasDocsPage";

/**
 * Docs-page parameters shared by the public section stories: a plain-language
 * description, then a copy-paste usage snippet. The live preview stays on the
 * Default / Stacked stories, because several of these sections don't render
 * correctly when more than one instance shares the docs page.
 */
export function sectionDocs({
  summary,
  stories,
  spec,
  provider,
  alone,
  importNames,
  componentName,
  composedChildren,
}: {
  /** What the section shows, and what a click or expand does. */
  summary: string;
  /** Sidebar entries to open, e.g. "Default or Stacked". */
  stories: string;
  spec: "AsyncAPI" | "OpenAPI";
  provider: "AsyncAPIProvider" | "OpenAPIProvider";
  /** How `layout` behaves for this section. */
  alone: string;
  importNames: string[];
  componentName: string;
  /** Indented JSX rendered inside the provider. */
  composedChildren: string;
}) {
  const documentVar = spec === "AsyncAPI" ? "asyncapiDocument" : "openapiDocument";

  return {
    page: NoCanvasDocsPage,
    description: {
      component: `${summary}

Open **${stories}** in the sidebar to see it.

\`document\` is the parsed ${spec} JSON, for example a JSON file you imported. Import the stylesheet once in your app: \`import "apiuikit/style.css"\`.

**On its own.** Pass \`document\` to the component. ${alone}

**With other sections.** Put them inside \`${provider}\` and pass \`document\` to the provider. Every section inside reads that document, so you pass it once.`,
    },
    source: {
      language: "tsx" as const,
      code: `import { ${importNames.join(", ")} } from "apiuikit";
import "apiuikit/style.css";

// ${documentVar} is the parsed ${spec} JSON.

// On its own. "stacked" uses the full width.
<${componentName} document={${documentVar}} layout="stacked" />

// With other sections. Pass the document once, on the provider.
<${provider} document={${documentVar}}>
${composedChildren}
</${provider}>`,
    },
  };
}

/** Shown in the props table as the default for every section's `layout`. */
export const layoutArgType = {
  layout: {
    control: "radio" as const,
    options: ["columns", "stacked"],
    table: { defaultValue: { summary: '"columns"' } },
  },
};

/**
 * Docs-page parameters for the full-page widgets (`AsyncAPI`, `OpenAPI`, and
 * their renderers). Same shape as the section pages: what it shows, which
 * sidebar story to open, then a copy-paste snippet.
 */
export function widgetDocs({
  summary,
  stories,
  code,
  note,
}: {
  summary: string;
  stories: string;
  code: string;
  /** An extra paragraph, e.g. about Try it. */
  note?: string;
}) {
  return {
    page: NoCanvasDocsPage,
    description: {
      component: `${summary}

Open **${stories}** in the sidebar to see it.
${note ? `\n${note}\n` : ""}
Import the stylesheet once in your app: \`import "apiuikit/style.css"\`.`,
    },
    source: {
      language: "tsx" as const,
      code,
    },
  };
}

/** `layout` for sections whose right column is only there to line up with Info and Servers. */
export function alignedAlone(sectionName: string) {
  return `\`layout="stacked"\` makes it use the full width, which is what you want when ${sectionName} is the only section on the page. \`layout="columns"\` (the default) leaves an empty column on the right so it lines up with Info and Servers.`;
}

/**
 * Docs-page parameters for the single-item sections (`OpenAPIEndpoint`,
 * `AsyncAPIOperation`, `Schema`, …): like `sectionDocs`, but the snippet
 * names the item to render.
 */
export function itemDocs({
  summary,
  spec,
  provider,
  componentName,
  selector,
  composedChildren,
  tryIt = false,
}: {
  /** What the component shows. */
  summary: string;
  spec: "AsyncAPI" | "OpenAPI";
  provider: "AsyncAPIProvider" | "OpenAPIProvider";
  componentName: string;
  /** The JSX props that pick the item, e.g. `operationId="createPet"`. */
  selector: string;
  /** Indented JSX rendered inside the provider. */
  composedChildren: string;
  /** Whether the component has a Try it button (and a WithTryIt story) to mention. */
  tryIt?: boolean;
}) {
  const documentVar = spec === "AsyncAPI" ? "asyncapiDocument" : "openapiDocument";

  return {
    page: NoCanvasDocsPage,
    description: {
      component: `${summary}

Open **Default** in the sidebar to see it.${tryIt ? `

**Try it** is off by default. Turn it on with \`config={{ show: { tryIt: true } }}\`, then open **WithTryIt** to see the button in the header.${spec === "AsyncAPI" ? " The AsyncAPI button is a WebSocket client, so it only appears for operations with a `ws` or `wss` server." : ""}` : ""}

\`document\` is the parsed ${spec} JSON. If nothing in it matches, the component renders nothing and logs a warning to the console. Import the stylesheet once in your app: \`import "apiuikit/style.css"\`.

**On its own.** Pass \`document\` to the component. It uses the full width by default; \`layout="columns"\` instead leaves an empty column on the right so it lines up with Info and Servers.

**Mixed into your own page.** Put several inside \`${provider}\`, between your own content, and pass \`document\` once to the provider.`,
    },
    source: {
      language: "tsx" as const,
      code: `import { ${componentName}, ${provider} } from "apiuikit";
import "apiuikit/style.css";

// ${documentVar} is the parsed ${spec} JSON.

// On its own.
<${componentName} document={${documentVar}} ${selector} />

// Mixed into your own page. Pass the document once, on the provider.
<${provider} document={${documentVar}}>
${composedChildren}
</${provider}>`,
    },
  };
}

/** `layout` for the single-item sections, which default to the full width. */
export const itemLayoutArgType = {
  layout: {
    control: "radio" as const,
    options: ["columns", "stacked"],
    table: { defaultValue: { summary: '"stacked"' } },
  },
};
