import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Operations from "../Operations";
import { OperationTitle } from "../OperationHeader";
import { DocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../../components/schema/depthColors";
import type { AsyncAPIDocumentData } from "../../../types/schema";
import { OperationAction } from "../../../types/asyncapi/OperationAction";
import type { Operation as OperationInterface } from "../../../types/asyncapi/Operation";

const channel = { address: "/v2" };

const operations = {
  subscribe: { action: OperationAction.RECEIVE, channel, title: "Subscribe to a feed" },
  sendTicker: { action: OperationAction.SEND, channel },
} as unknown as Record<string, OperationInterface>;

function renderInDocument(ui: React.ReactElement) {
  return render(
    <DocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: {} as AsyncAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        sidePanelContainment: "component",
        resolvedMode: "light",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
      }}
    >
      {ui}
    </DocumentContext.Provider>,
  );
}

const renderOperations = () => renderInDocument(<Operations operations={operations} />);

describe("Operations table", () => {
  it("shows the operation's title in place of its address", () => {
    renderOperations();

    const row = screen.getByRole("button", { name: "RECEIVE Subscribe to a feed" });
    expect(within(row).getByText("Subscribe to a feed")).toBeInTheDocument();
    expect(within(row).queryByText("/v2")).not.toBeInTheDocument();
  });

  it("falls back to the address alone for an operation without a title", () => {
    renderOperations();

    const row = screen.getByRole("button", { name: "SEND /v2" });
    expect(within(row).getByText("/v2")).toBeInTheDocument();
    expect(within(row).queryByText("Subscribe to a feed")).not.toBeInTheDocument();
  });
});

describe("OperationTitle (side panel header)", () => {
  it("shows the operation's title in place of its address", () => {
    renderInDocument(<OperationTitle op={operations.subscribe} operationKey="subscribe" />);

    expect(screen.getByText("Subscribe to a feed")).toBeInTheDocument();
    expect(screen.queryByText("/v2")).not.toBeInTheDocument();
  });

  it("shows the address for an operation without a title", () => {
    renderInDocument(<OperationTitle op={operations.sendTicker} operationKey="sendTicker" />);

    expect(screen.getByText("/v2")).toBeInTheDocument();
  });
});
