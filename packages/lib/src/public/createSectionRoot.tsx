import { useContext, useEffect, useMemo } from "react";
import type { ComponentType, ReactNode } from "react";
import { DocumentContext, SpecType } from "../contexts";
import { resolveDocument } from "../helpers/resolveDocument";
import { ConfigInterface } from "../config";
import type { ApiuikitPlugin } from "../plugins/types";

export interface GenericSectionProps<T> {
  /** The document. Required standalone; unnecessary (and ignored) when rendered inside the matching provider. */
  document?: T;
  config?: ConfigInterface;
  /** Third-party plugins. Only applied standalone (this section sets up its own provider); composed under an ambient provider, that provider's own `plugins` apply instead. */
  plugins?: ApiuikitPlugin[];
}

/**
 * Builds a `SectionRoot`: renders `children` inside the ambient document
 * context if there is one of the matching spec type (composed mode, e.g.
 * under <AsyncAPIProvider>), otherwise resolves the `document` prop and sets
 * up `Provider` itself (standalone mode). Shared behind both
 * public/sections.tsx (AsyncAPI) and public/openapiSections.tsx (OpenAPI),
 * which differ only in which document provider component backs them, the
 * label used in messages, and the spec type they expect.
 *
 * A mismatched ambient provider (an OpenAPI section under <AsyncAPIProvider>,
 * or vice versa) can't supply the section's document. When that happens the
 * section warns, then falls back to its own `document` prop if one was given;
 * without one it renders under the mismatched context anyway (typically
 * empty) rather than crashing the tree.
 */
export function createSectionRoot<T>(
  Provider: ComponentType<{ document: T; config?: ConfigInterface; plugins?: ApiuikitPlugin[]; children: ReactNode }>,
  specLabel: string,
  specType: SpecType,
) {
  return function SectionRoot({
    document,
    config,
    plugins,
    children,
  }: GenericSectionProps<T> & { children: ReactNode }) {
    const ambient = useContext(DocumentContext);
    const resolved = useMemo(
      () => (document ? resolveDocument(document) : null),
      [document],
    );

    const mismatched = !!ambient && ambient.specType !== specType;
    useEffect(() => {
      if (!mismatched) return;
      console.warn(
        `[apiuikit] A ${specLabel} section is rendered inside a ${ambient!.specType} document provider, ` +
          `which cannot supply the document it needs. ` +
          (resolved
            ? "Using the section's own `document` prop instead."
            : `Wrap it in <${specLabel}Provider> or pass it a \`document\` prop.`),
      );
    }, [ambient, mismatched, resolved]);

    if (ambient && !mismatched) return <>{children}</>;

    if (!resolved) {
      if (ambient) return <>{children}</>;
      throw new Error(
        `This ${specLabel} section needs a \`document\` prop unless it is rendered ` +
          `inside <${specLabel}Provider>.`,
      );
    }

    return (
      <Provider document={resolved} config={config} plugins={plugins}>
        {children}
      </Provider>
    );
  };
}
