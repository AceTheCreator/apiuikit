import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import QueryParameters, { type QueryParameterDetail } from "../QueryParameters";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";

/** The popover portals into `portalHost`, so it needs a real element to land in. */
function renderChip(node: ReactNode) {
  const portalHost = document.createElement("div");
  document.body.appendChild(portalHost);

  return render(
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document: { openapi: "3.0.3", info: { title: "Test API", version: "1.0.0" } },
        deref: () => undefined,
        portalHost,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
      }}
    >
      {node}
    </DocumentContext.Provider>,
  );
}

const parameters: QueryParameterDetail[] = [
  { name: "limit", type: "integer", default: "20", description: "How many to return." },
  { name: "order_by", type: "string", enum: ["asc", "desc"], required: true },
];

describe("QueryParameters", () => {
  it("renders nothing when the operation has no query parameters", () => {
    const { container } = renderChip(<QueryParameters parameters={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("collapses to a count rather than spelling the parameters into the address", () => {
    renderChip(<QueryParameters parameters={parameters} />);
    expect(screen.getByRole("button", { name: "2 query parameters" })).toHaveTextContent("?2");
    // Closed by default — the whole point is that the header stays short.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("singularizes its label for a lone parameter", () => {
    renderChip(<QueryParameters parameters={[parameters[0]]} />);
    expect(screen.getByRole("button", { name: "1 query parameter" })).toBeInTheDocument();
  });

  it("lists each parameter's details on open", async () => {
    const user = userEvent.setup();
    renderChip(<QueryParameters parameters={parameters} />);

    await user.click(screen.getByRole("button", { name: "2 query parameters" }));

    const popover = screen.getByRole("dialog", { name: "Query parameters" });
    expect(popover).toHaveTextContent("limit");
    expect(popover).toHaveTextContent("How many to return.");
    expect(popover).toHaveTextContent("Default:");
    expect(popover).toHaveTextContent("20");
    expect(popover).toHaveTextContent("order_by");
    expect(popover).toHaveTextContent("Required");
    expect(popover).toHaveTextContent("asc");
  });

  it("closes on a second click", async () => {
    const user = userEvent.setup();
    renderChip(<QueryParameters parameters={parameters} />);
    const trigger = screen.getByRole("button", { name: "2 query parameters" });

    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the chip", async () => {
    const user = userEvent.setup();
    renderChip(<QueryParameters parameters={parameters} />);
    const trigger = screen.getByRole("button", { name: "2 query parameters" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when pointing somewhere else", async () => {
    const user = userEvent.setup();
    renderChip(
      <>
        <QueryParameters parameters={parameters} />
        <button type="button">Elsewhere</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "2 query parameters" }));
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open while interacting with the list itself", async () => {
    const user = userEvent.setup();
    renderChip(<QueryParameters parameters={parameters} />);

    await user.click(screen.getByRole("button", { name: "2 query parameters" }));
    await user.click(screen.getByRole("dialog"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
