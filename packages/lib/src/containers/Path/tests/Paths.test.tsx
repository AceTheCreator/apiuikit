import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../../components/schema/depthColors";
import type { OpenAPIDocumentData, OpenAPIPathItemData } from "../../../types/openapi";
import Paths from "../Paths";

const paths: Record<string, OpenAPIPathItemData> = {
  "/health": { get: { responses: {} } },
  "/pets": {
    get: { tags: ["Pets"], responses: {} },
    post: { tags: ["Pets"], responses: {} },
  },
  "/users": { get: { tags: ["Users"], responses: {} } },
};

function renderPaths(selectedKey?: string | null) {
  const document = { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths } as OpenAPIDocumentData;
  return render(
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
      }}
    >
      <Paths paths={paths} selectedKey={selectedKey} />
    </DocumentContext.Provider>,
  );
}

describe("Paths endpoint groups", () => {
  it("groups operations by their primary tag and keeps untagged operations together", () => {
    renderPaths();

    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Users endpoints (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Other endpoints (1)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "POST /pets" })).toBeInTheDocument();
  });

  it("collapses and expands a group without affecting the others", () => {
    renderPaths();

    fireEvent.click(screen.getByRole("button", { name: "Pets endpoints (2)" }));
    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "GET /pets" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GET /users" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pets endpoints (2)" }));
    expect(screen.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
  });

  it("expands and collapses every group from one checkbox", () => {
    renderPaths();

    const expandAll = screen.getByRole("checkbox", { name: "Expand all" });
    expect(expandAll).toBeChecked();
    fireEvent.click(expandAll);

    expect(expandAll).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "GET /pets" })).not.toBeInTheDocument();
    // Rows remain mounted so their height and opacity can transition smoothly.
    expect(document.getElementById("endpoint-get /pets")).toHaveClass("opacity-0");

    fireEvent.click(expandAll);
    expect(expandAll).toBeChecked();
    expect(screen.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
  });

  it("toggles every group when Enter is pressed on the checkbox", () => {
    renderPaths();
    const expandAll = screen.getByRole("checkbox", { name: "Expand all" });

    fireEvent.keyDown(expandAll, { key: "Enter" });
    expect(expandAll).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "false");

    fireEvent.keyDown(expandAll, { key: "Enter" });
    expect(expandAll).toBeChecked();
    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "true");
  });

  it("reveals a collapsed group when one of its endpoints is selected externally", () => {
    const view = renderPaths();
    fireEvent.click(screen.getByRole("button", { name: "Pets endpoints (2)" }));

    view.rerender(
      <DocumentContext.Provider
        value={{
          specType: "openapi",
          document: { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths } as OpenAPIDocumentData,
          deref: () => undefined,
          portalHost: null,
          rootElement: null,
          depthColors: DEFAULT_DEPTH_COLORS,
          showExtensions: true,
          showCodeSamples: true,
        }}
      >
        <Paths paths={paths} selectedKey="get /pets" />
      </DocumentContext.Provider>,
    );

    expect(screen.getByRole("button", { name: "Pets endpoints (2)" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
  });
});
