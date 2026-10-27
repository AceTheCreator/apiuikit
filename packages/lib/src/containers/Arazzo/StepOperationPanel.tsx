import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { SidePanel } from "../../components/SidePanel";
import { DocumentContext, useArazzoDocumentContext } from "../../contexts";
import { useDocumentProviderValue } from "../../hooks/useDocumentProviderValue";
import { resolveOperationParameters, type OpenAPIDocumentData } from "../../types/openapi";
import type { ArazzoStepTarget } from "../../types/arazzo";
import { EndpointHeaderActions, EndpointTitle } from "../Path/EndpointHeader";
import PathOperation from "../Path/PathOperation";

export type LinkedOperation = Extract<ArazzoStepTarget, { kind: "operation"; status: "linked" }>;

/** The step operation shown in the panel. */
export interface StepOperationSelection {
  target: LinkedOperation;
  /** The OpenAPI document of `target.sourceName`. */
  source: OpenAPIDocumentData;
  /** Unique per step on the page; the operation's own DOM ids are derived from it. */
  anchorId: string;
}

interface StepOperationPanelApi {
  /** The step whose operation is open, or null while the panel is closed. */
  openAnchorId: string | null;
  open: (selection: StepOperationSelection) => void;
}

const StepOperationPanelContext = createContext<StepOperationPanelApi | null>(null);

/** Opens a step's operation in the document's side panel. Null outside an Arazzo provider. */
export const useStepOperationPanel = () => useContext(StepOperationPanelContext);

/**
 * An OpenAPI document context for one of the Arazzo document's sources —
 * steps in one workflow may call different documents. Unlike
 * OpenAPIDocumentProvider it adds no root element: the portal host and root
 * stay the Arazzo document's, so overlays opened from inside the panel
 * (Try it, popovers) layer over the whole page rather than being trapped in
 * the panel.
 */
function SourceDocumentContext({ document, children }: { document: OpenAPIDocumentData; children: ReactNode }) {
  const outer = useArazzoDocumentContext();
  const { contextValue } = useDocumentProviderValue("openapi", document, outer.config, outer.plugins);
  const value = useMemo(
    () => ({ ...contextValue, portalHost: outer.portalHost, rootElement: outer.rootElement }),
    [contextValue, outer.portalHost, outer.rootElement],
  );
  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

/**
 * One side panel for the whole Arazzo document, showing the OpenAPI
 * operation a step calls exactly as the OpenAPI page's endpoint panel does:
 * same title, same header actions (Try it), same body. One shared panel, as
 * on the OpenAPI page, so it slides in once and opening another step swaps
 * its contents in place.
 */
export function StepOperationPanelHost({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<StepOperationSelection | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback((next: StepOperationSelection) => {
    setSelection(next);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const api = useMemo(
    () => ({ openAnchorId: isOpen && selection ? selection.anchorId : null, open }),
    [isOpen, selection, open],
  );

  // The selection outlives closing, so the panel keeps its content while it
  // slides out.
  const { target, source, anchorId } = selection ?? {};
  const parameters = target ? resolveOperationParameters(target.pathItem, target.operation) : [];

  return (
    <StepOperationPanelContext.Provider value={api}>
      {children}
      <SidePanel
        isOpen={isOpen}
        side="right"
        onClose={close}
        title={target && <EndpointTitle method={target.method} path={target.path} parameters={parameters} />}
        headerActions={
          target &&
          source && (
            <SourceDocumentContext document={source}>
              <EndpointHeaderActions method={target.method} path={target.path} />
            </SourceDocumentContext>
          )
        }
      >
        {target && source && anchorId && (
          <SourceDocumentContext document={source}>
            <ErrorBoundary
              key={anchorId}
              resetKey={target.operation}
              fallback={<p role="alert">This operation could not be rendered. The rest of the workflow is still available.</p>}
            >
              <PathOperation
                // Remounts per step so a `*.operation.tab` plugin tab (and its
                // state) doesn't carry over to another step's operation.
                key={anchorId}
                method={target.method}
                path={target.path}
                op={{ ...target.operation, parameters }}
                id={anchorId}
                idPrefix={target.isWebhook ? "step-webhook" : "step-op"}
                globalSecurity={source.security}
                securitySchemes={source.components?.securitySchemes}
              />
            </ErrorBoundary>
          </SourceDocumentContext>
        )}
      </SidePanel>
    </StepOperationPanelContext.Provider>
  );
}
