import type { ReactNode } from "react";
import { DocumentContext } from "../../contexts/index";
import { ConfigInterface, defaultConfig } from "../../config";
import { useDocumentProviderValue } from "../../hooks/useDocumentProviderValue";
import { OpenAPIDocumentData } from "../../types/openapi";

export interface OpenAPIDocumentProviderProps {
  document: OpenAPIDocumentData;
  config?: ConfigInterface;
  /** Extra classes merged onto the root surface (e.g. Layout's sidebar `pt-14`). */
  className?: string;
  children: ReactNode;
}

/** Mirrors AsyncAPIDocumentProvider, sharing the same DocumentContext shape. */
export function OpenAPIDocumentProvider({
  document: openapi,
  config = defaultConfig,
  className = "",
  children,
}: OpenAPIDocumentProviderProps) {
  const { contextValue, themeVars, setPortalHost, setRootElement } = useDocumentProviderValue(openapi, config);

  return (
    <DocumentContext.Provider value={contextValue}>
      <div
        ref={setRootElement}
        style={themeVars as React.CSSProperties}
        className={`relative @container bg-background text-foreground p-2 ${className}`}
      >
        <div ref={setPortalHost} className="openapi-portal-root" />
        {children}
      </div>
    </DocumentContext.Provider>
  );
}

export default OpenAPIDocumentProvider;
