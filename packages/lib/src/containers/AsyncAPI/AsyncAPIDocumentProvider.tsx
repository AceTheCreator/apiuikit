import type { ReactNode } from "react";
import { DocumentContext } from "../../contexts/index";
import { ConfigInterface, defaultConfig } from "../../config";
import { useDocumentProviderValue } from "../../hooks/useDocumentProviderValue";
import { AsyncAPIDocumentData } from "../../types/schema";
import type { ApiuikitPlugin } from "../../plugins/types";

export interface AsyncAPIDocumentProviderProps {
  document: AsyncAPIDocumentData;
  config?: ConfigInterface;
  /** Third-party plugins to register on this document's context. */
  plugins?: ApiuikitPlugin[];
  /** Extra classes merged onto the root surface (e.g. Layout's sidebar `pt-14`). */
  className?: string;
  children: ReactNode;
}

export function AsyncAPIDocumentProvider({
  document: asyncapi,
  config = defaultConfig,
  plugins,
  className = "",
  children,
}: AsyncAPIDocumentProviderProps) {
  const { contextValue, themeVars, setPortalHost, setRootElement } = useDocumentProviderValue("asyncapi", asyncapi, config, plugins);

  return (
    <DocumentContext.Provider value={contextValue}>
      <div
        ref={setRootElement}
        style={themeVars as React.CSSProperties}
        className={`relative @container bg-background text-foreground p-2 ${className}`}
      >
        <div ref={setPortalHost} className="asyncapi-portal-root" />
        {children}
      </div>
    </DocumentContext.Provider>
  );
}

export default AsyncAPIDocumentProvider;
