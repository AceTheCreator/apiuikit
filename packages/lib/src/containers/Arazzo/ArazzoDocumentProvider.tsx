import { useMemo, type ReactNode } from "react";
import { DocumentContext, type ArazzoDocumentContextValue } from "../../contexts";
import { ConfigInterface, defaultConfig } from "../../config";
import { useDocumentProviderValue } from "../../hooks/useDocumentProviderValue";
import type { ArazzoModel } from "../../types/arazzo";
import type { ApiuikitPlugin } from "../../plugins/types";
import { StepOperationPanelHost } from "./StepOperationPanel";

export interface ArazzoDocumentProviderProps {
  model: ArazzoModel;
  config?: ConfigInterface;
  /** Plugins, passed on to the OpenAPI operations embedded in steps. */
  plugins?: ApiuikitPlugin[];
  /** Extra classes merged onto the root surface. */
  className?: string;
  children: ReactNode;
}

/** Mirrors OpenAPIDocumentProvider; the context additionally carries the resolved model. */
export function ArazzoDocumentProvider({
  model,
  config = defaultConfig,
  plugins,
  className = "",
  children,
}: ArazzoDocumentProviderProps) {
  const { contextValue, themeVars, resolvedMode, setPortalHost, setRootElement } = useDocumentProviderValue(
    "arazzo",
    model.document,
    config,
    plugins,
  );
  const value = useMemo<ArazzoDocumentContextValue>(() => ({ ...contextValue, model }), [contextValue, model]);

  return (
    <DocumentContext.Provider value={value}>
      <div
        ref={setRootElement}
        data-theme={resolvedMode}
        style={themeVars as React.CSSProperties}
        className={`apiuikit-root relative @container bg-background text-foreground ${className}`}
      >
        <div ref={setPortalHost} className="arazzo-portal-root" />
        <StepOperationPanelHost>{children}</StepOperationPanelHost>
      </div>
    </DocumentContext.Provider>
  );
}

export default ArazzoDocumentProvider;
