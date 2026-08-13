import type { ReactNode } from "react";
import { DocumentContext } from "../../contexts/index";
import { ConfigInterface, defaultConfig } from "../../config";
import { useDocumentProviderValue } from "../../hooks/useDocumentProviderValue";
import { AsyncAPIDocumentData } from "../../types/schema";

export interface AsyncAPIDocumentProviderProps {
  document: AsyncAPIDocumentData;
  config?: ConfigInterface;
  /** Extra classes merged onto the root surface. */
  className?: string;
  children: ReactNode;
}

export function AsyncAPIDocumentProvider({
  document: asyncapi,
  config = defaultConfig,
  className = "",
  children,
}: AsyncAPIDocumentProviderProps) {
  const { contextValue, themeVars, setPortalHost, setRootElement } = useDocumentProviderValue("asyncapi", asyncapi, config);

  return (
    <DocumentContext.Provider value={contextValue}>
      <div
        ref={setRootElement}
        style={themeVars as React.CSSProperties}
        className={`relative @container bg-background text-foreground ${className}`}
      >
        <div ref={setPortalHost} className="asyncapi-portal-root" />
        {children}
      </div>
    </DocumentContext.Provider>
  );
}

export default AsyncAPIDocumentProvider;
