import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Operation from "../Operation";
import { DocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../../components/schema/depthColors";
import { definePlugin } from "../../../plugins/types";
import type { ApiuikitPlugin } from "../../../plugins/types";
import type { AsyncAPIDocumentData } from "../../../types/schema";
import { OperationAction } from "../../../types/asyncapi/OperationAction";
import type { Operation as OperationInterface } from "../../../types/asyncapi/Operation";

const baseOp = {
  action: OperationAction.SEND,
  channel: {},
  summary: "Send a chat message",
} as unknown as OperationInterface;

function withContext(children: React.ReactNode, plugins?: ApiuikitPlugin[]) {
  return (
    <DocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: {} as AsyncAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
        plugins,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

describe("Operation plugin tabs", () => {
  const sendItPlugin = definePlugin({
    name: "send-it",
    slots: {
      "asyncapi.operation.tab": {
        label: "Send it",
        component: ({ operationId }) => <div>plugin content for {operationId}</div>,
      },
    },
  });

  it("shows no tab strip at all when no operation.tab plugin is registered", () => {
    render(withContext(<Operation op={baseOp} id="sendMessage" />));

    expect(screen.queryByRole("tab", { name: "Reference" })).not.toBeInTheDocument();
  });

  it("adds a Reference tab plus one per registered plugin, opening on Reference", () => {
    render(withContext(<Operation op={baseOp} id="sendMessage" />, [sendItPlugin]));

    expect(screen.getByRole("tab", { name: "Reference", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Send it" })).toBeInTheDocument();
    expect(screen.getByText("Send a chat message")).toBeInTheDocument();
    expect(screen.queryByText(/plugin content for/)).not.toBeInTheDocument();
  });

  it("hands the plugin the whole panel body when its tab is selected, hiding documentation content", () => {
    render(withContext(<Operation op={baseOp} id="sendMessage" />, [sendItPlugin]));

    fireEvent.click(screen.getByRole("tab", { name: "Send it" }));

    expect(screen.getByText("plugin content for sendMessage")).toBeInTheDocument();
    expect(screen.queryByText("Send a chat message")).not.toBeInTheDocument();
  });

  it("switches back to full documentation content when Reference is reselected", () => {
    render(withContext(<Operation op={baseOp} id="sendMessage" />, [sendItPlugin]));

    fireEvent.click(screen.getByRole("tab", { name: "Send it" }));
    fireEvent.click(screen.getByRole("tab", { name: "Reference" }));

    expect(screen.getByText("Send a chat message")).toBeInTheDocument();
    expect(screen.queryByText(/plugin content for/)).not.toBeInTheDocument();
  });
});

describe("Operation supplementary slot", () => {
  it("renders nothing when no reference supplementary plugin is registered", () => {
    render(withContext(<Operation op={baseOp} id="sendMessage" />));

    expect(screen.queryByText(/annotation for/)).not.toBeInTheDocument();
  });

  it("renders a plugin's operation supplementary slot with the operationId context", () => {
    const annotate = definePlugin({
      name: "annotate",
      slots: {
        "asyncapi.operation.reference.supplementary": ({ operationId }) => <div>annotation for {operationId}</div>,
      },
    });

    render(withContext(<Operation op={baseOp} id="sendMessage" />, [annotate]));

    expect(screen.getByText("annotation for sendMessage")).toBeInTheDocument();
  });

  it("hides the supplementary slot while a plugin's own tab is active", () => {
    const annotate = definePlugin({
      name: "annotate",
      slots: {
        "asyncapi.operation.reference.supplementary": ({ operationId }) => <div>annotation for {operationId}</div>,
        "asyncapi.operation.tab": { label: "Send it", component: () => <div>tab content</div> },
      },
    });

    render(withContext(<Operation op={baseOp} id="sendMessage" />, [annotate]));
    expect(screen.getByText("annotation for sendMessage")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Send it" }));
    expect(screen.queryByText(/annotation for/)).not.toBeInTheDocument();
  });
});
