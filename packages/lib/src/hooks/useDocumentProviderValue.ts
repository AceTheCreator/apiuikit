import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfigInterface, defaultConfig } from "../config";
import { buildThemeVars } from "../utils/theme";
import { DEFAULT_DEPTH_COLORS } from "../components/schema/depthColors";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * Builds the shared DocumentContext value (deref resolver, portal/root refs,
 * theme-derived settings) plus the CSS custom properties for the theme —
 * used by both AsyncAPIDocumentProvider and OpenAPIDocumentProvider, which
 * differ only in the document's declared type and the portal element's
 * className.
 */
export function useDocumentProviderValue(document: Record<string, unknown>, config: ConfigInterface = defaultConfig) {
  const derefCache = useMemo(() => new Map<string, unknown>(), []);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    derefCache.clear();
  }, [document, derefCache]);

  // Fallback resolver for the few $refs that survive upfront resolution — see
  // resolveDocument's own doc for why cycle-forming refs are left in place.
  const deref = useCallback((refPath: string) => {
    if (derefCache.has(refPath)) return derefCache.get(refPath);

    const parts = refPath.replace(/^#\//, "").split("/");
    let current: unknown = document;

    for (const part of parts) {
      if (!isRecord(current)) {
        current = undefined;
        break;
      }
      const decoded = part.replace(/~1/g, "/").replace(/~0/g, "~");
      current = current[decoded];
      if (current == null) break;
    }

    if (current !== undefined) {
      derefCache.set(refPath, current);
    }

    return current;
  }, [document, derefCache]);

  const defaultSchemaExpanded = config.expand?.schemas === true;
  const depthColors = config.theme?.depthColors?.length
    ? config.theme.depthColors
    : DEFAULT_DEPTH_COLORS;

  const contextValue = useMemo(
    () => ({ document, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors }),
    [document, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors],
  );

  const themeVars = config.theme ? buildThemeVars(config.theme) : {};

  return { contextValue, themeVars, setPortalHost, setRootElement };
}
