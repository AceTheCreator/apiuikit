import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Operations from "../Operations";
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

function renderOperations() {
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
      <Operations operations={operations} />
    </DocumentContext.Provider>,
  );
}

describe("Operations table", () => {
  it("leads with the operation's title and keeps its address beneath", () => {
    renderOperations();

    const row = screen.getByRole("button", { name: "RECEIVE Subscribe to a feed" });
    expect(within(row).getByText("Subscribe to a feed")).toBeInTheDocument();
    expect(within(row).getByText("/v2")).toBeInTheDocument();
  });

  it("falls back to the address alone for an operation without a title", () => {
    renderOperations();

    const row = screen.getByRole("button", { name: "SEND /v2" });
    expect(within(row).getByText("/v2")).toBeInTheDocument();
    expect(within(row).queryByText("Subscribe to a feed")).not.toBeInTheDocument();
  });
});
