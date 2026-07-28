import { useContext, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { DocumentContext } from "../contexts";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";

export interface GenericSectionProps<T> {
  /** The document. Required standalone; unnecessary (and ignored) when rendered inside the matching provider. */
  document?: T;
  config?: ConfigInterface;
}

/**
 * Builds a `SectionRoot`: renders `children` inside the ambient document
 * context if there is one (composed mode, e.g. under <AsyncAPIProvider>),
 * otherwise resolves the `document` prop and sets up `Provider` itself
 * (standalone mode). Shared behind both public/sections.tsx (AsyncAPI) and
 * public/openapiSections.tsx (OpenAPI) — they differ only in which document
 * provider component backs them and the label used in the standalone-mode
 * error message.
 */
export function createSectionRoot<T>(
  Provider: ComponentType<{ document: T; config?: ConfigInterface; children: ReactNode }>,
  specLabel: string,
) {
  return function SectionRoot({
    document,
    config,
    children,
  }: GenericSectionProps<T> & { children: ReactNode }) {
    const ambient = useContext(DocumentContext);
    const resolved = useMemo(
      () => (document ? resolveDocument(document) : null),
      [document],
    );

    if (ambient) return <>{children}</>;

    if (!resolved) {
      throw new Error(
        `This ${specLabel} section needs a \`document\` prop unless it is rendered ` +
          `inside <${specLabel}Provider>.`,
      );
    }

    return (
      <Provider document={resolved} config={config}>
        {children}
      </Provider>
    );
  };
}
