import { useState, type ComponentType } from "react";
import { AsyncAPIDocumentContext } from "../contexts";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import { resolveDocument } from "../helpers/resolveDocument";
import type { AsyncAPIDocumentData } from "../types/schema";

/**
 * Centers a component story at one consistent max width and makes it fill that
 * width. Scoped per-story (not global) on purpose: the full-page AsyncAPI
 * example stories should render edge-to-edge, so centering must not be applied
 * globally in preview.
 */
export const centeredDecorator = (Story: ComponentType) => (
  <div className="mx-auto w-full max-w-4xl p-4">
    <Story />
  </div>
);

/**
 * Shared Storybook decorator for rendering container components
 * (Servers/Messages/Operations) in isolation. Those components, and their
 * children (ChannelAddress, MessageDetails, the schema tree), read from
 * AsyncAPIDocumentContext via useAsyncAPIDocument, which throws without a
 * provider. This wraps a story in that provider, backed by a real document.
 *
 * `resolveDocument` inlines the doc's $refs (server security, message
 * payloads, …) the way the production render path does, so stories show
 * fully-resolved content instead of raw { $ref } wrappers, and the `deref`
 * fallback below resolves any refs left in place (e.g. cycle-forming ones).
 */
export function buildDocumentContext(rawDoc: unknown) {
  const document = resolveDocument(rawDoc as Record<string, unknown>);

  const deref = (refPath: string): unknown => {
    const parts = refPath.replace(/^#\//, "").split("/");
    let current: unknown = document;
    for (const part of parts) {
      if (typeof current !== "object" || current === null) return undefined;
      const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
      current = (current as Record<string, unknown>)[decoded];
      if (current == null) return undefined;
    }
    return current;
  };

  // Provides document context and applies the shared centered sizing.
  // portalHost/rootElement are real DOM nodes (not null) so components that
  // portal into them (e.g. SidePanel, SearchPanel's modal) actually render in
  // stories instead of silently no-op'ing.
  const ContextProvider = ({ Story }: { Story: ComponentType }) => {
    const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
    const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

    return (
      <AsyncAPIDocumentContext.Provider
        value={{
          specType: "asyncapi",
          document: document as AsyncAPIDocumentData,
          deref,
          portalHost,
          rootElement,
          depthColors: DEFAULT_DEPTH_COLORS,
          showExtensions: true,
          showCodeSamples: true,
        }}
      >
        <div ref={setRootElement} className="relative">
          <div ref={setPortalHost} />
          {centeredDecorator(Story)}
        </div>
      </AsyncAPIDocumentContext.Provider>
    );
  };

  const decorator = (Story: ComponentType) => <ContextProvider Story={Story} />;

  return { document, deref, decorator };
}
