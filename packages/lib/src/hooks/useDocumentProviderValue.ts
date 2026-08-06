import { useMemo, useState } from "react";
import { ConfigInterface, defaultConfig } from "../config";
import type { MarkdownUrlResolver } from "../config/config";
import { SpecType } from "../contexts";
import { buildThemeVars } from "../utils/theme";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";
import { createDocumentDeref } from "../helpers/jsonPointer";

/**
 * Builds the shared DocumentContext value (deref resolver, portal/root refs,
 * theme-derived settings) plus the CSS custom properties for the theme,
 * used by both AsyncAPIDocumentProvider and OpenAPIDocumentProvider, which
 * differ only in the spec type they declare and the portal element's
 * className. Generic so the returned contextValue keeps the caller's literal
 * `specType` and document type, and thus lands as the right member of the
 * DocumentContextValue union.
 */
export function useDocumentProviderValue<S extends SpecType, D extends object>(
  specType: S,
  document: D,
  config: ConfigInterface = defaultConfig,
) {
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  // Fallback resolver for the few $refs that survive upfront resolution — see
  // resolveDocument's own doc for why cycle-forming refs are left in place.
  // The resolver and its cache are replaced atomically with the document, so
  // a render can never observe cached values belonging to the previous spec.
  const deref = useMemo(() => createDocumentDeref(document), [document]);

  const defaultSchemaExpanded = config.expand?.schemas === true;
  const depthColors = config.theme?.depthColors?.length
    ? config.theme.depthColors
    : DEFAULT_DEPTH_COLORS;
  const showExtensions = config.show?.extensions !== false;
  const showCodeSamples = config.show?.codeSamples !== false;

  // Both accepted forms collapse to a resolver here so consumers have one
  // shape to call. A bare string applies to every target; a function decides
  // per target and can decline by returning null.
  const configuredMarkdownUrl = config.markdown?.url;
  const markdownUrl = useMemo<MarkdownUrlResolver | undefined>(() => {
    if (typeof configuredMarkdownUrl === "function") return configuredMarkdownUrl;
    if (typeof configuredMarkdownUrl === "string") return () => configuredMarkdownUrl;
    return undefined;
  }, [configuredMarkdownUrl]);

  const contextValue = useMemo(
    () => ({ specType, document, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors, showExtensions, showCodeSamples, markdownUrl }),
    [specType, document, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors, showExtensions, showCodeSamples, markdownUrl],
  );

  const themeVars = config.theme ? buildThemeVars(config.theme) : {};

  return { contextValue, themeVars, setPortalHost, setRootElement };
}
