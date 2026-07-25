import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AsyncAPIDocumentContext } from "../../contexts/index";
import { ConfigInterface, defaultConfig } from "../../config";
import { buildThemeVars } from "../../utils/theme";
import { DEFAULT_DEPTH_COLORS } from "../../components/schema/depthColors";
import { AsyncAPIDocumentData } from "../../types/schema";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export interface AsyncAPIDocumentProviderProps {
  document: AsyncAPIDocumentData;
  config?: ConfigInterface;
  /** Extra classes merged onto the root surface (e.g. Layout's sidebar `pt-14`). */
  className?: string;
  children: ReactNode;
}

export function AsyncAPIDocumentProvider({
  document: asyncapi,
  config = defaultConfig,
  className = "",
  children,
}: AsyncAPIDocumentProviderProps) {
  const derefCache = useMemo(() => new Map<string, unknown>(), []);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    derefCache.clear();
  }, [asyncapi, derefCache]);

  // Fallback resolver for the few $refs that survive upfront resolution:
  // resolveDocument deliberately leaves cycle-forming refs in place, and the
  // schema tree resolves those lazily (one level per expansion) via this.
  const deref = useCallback((refPath: string) => {
    if (derefCache.has(refPath)) return derefCache.get(refPath);

    const parts = refPath.replace(/^#\//, "").split("/");
    let current: unknown = asyncapi;

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
  }, [asyncapi, derefCache]);

  const defaultSchemaExpanded = config.expand?.schemas === true;
  const depthColors = config.theme?.depthColors?.length
    ? config.theme.depthColors
    : DEFAULT_DEPTH_COLORS;
  const showExtensions = config.show?.extensions !== false;

  const value = useMemo(
    () => ({ document: asyncapi, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors, showExtensions }),
    [asyncapi, deref, portalHost, rootElement, defaultSchemaExpanded, depthColors, showExtensions],
  );

  const themeVars = config.theme ? buildThemeVars(config.theme) : {};

  return (
    <AsyncAPIDocumentContext.Provider value={value}>
      <div
        ref={setRootElement}
        style={themeVars as React.CSSProperties}
        className={`relative @container bg-background text-foreground p-2 ${className}`}
      >
        <div ref={setPortalHost} className="asyncapi-portal-root" />
        {children}
      </div>
    </AsyncAPIDocumentContext.Provider>
  );
}

export default AsyncAPIDocumentProvider;
