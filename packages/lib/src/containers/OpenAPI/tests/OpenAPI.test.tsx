import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OpenAPI from "../OpenAPI";
import type { OpenAPIDocumentData } from "../../../types/openapi";
import exampleDoc from "../../../config/examples/openapi-petstore.json";

const asDoc = (doc: unknown) => doc as OpenAPIDocumentData;

describe("OpenAPI", () => {
  it("renders the document title and endpoint list", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    expect(screen.getByRole("heading", { name: "Petstore API" })).toBeInTheDocument();

    const panel = within(document.getElementById("panel-endpoints")!);
    expect(panel.getAllByText("/pets").length).toBeGreaterThan(0);
    expect(panel.getByRole("button", { name: "GET /pets" })).toBeInTheDocument();
  });

  it("resolves $refs into the schemas tab", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const panel = within(document.getElementById("panel-schemas")!);
    expect(panel.getByText("Pet")).toBeInTheDocument();
    expect(panel.getByText("NewPet")).toBeInTheDocument();
  });

  it("hides the servers section when show.servers is false", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} config={{ show: { servers: false } }} />);

    expect(screen.queryByText("api.example.com", { exact: false })).not.toBeInTheDocument();
  });

  it("hides the search panel when show.search is false", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} config={{ show: { search: false } }} />);

    expect(screen.queryByPlaceholderText("Search document...")).not.toBeInTheDocument();
  });

  it("opens an endpoint's detail panel with responses; its only parameter (a query param) surfaces via the address bar, not a Parameters tab", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    fireEvent.click(screen.getByRole("button", { name: "GET /pets" }));
    const detail = within(document.getElementById("endpoint-get /pets-detail")!);
    expect(detail.getByText("List all pets")).toBeInTheDocument();

    // Query parameters are appended to the address bar as `{name}` chunks
    // (with a hover tooltip for type/description), the same way path
    // parameters already appear — GET /pets has no other parameters and no
    // request body, so the Parameters/Body request card doesn't render at all.
    expect(screen.getByText("{limit}")).toBeInTheDocument();
    expect(detail.queryByText(/expects the following request/i)).not.toBeInTheDocument();
  });

  it("switches away from the active tab when a config change hides it", () => {
    const { rerender } = render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    expect(document.getElementById("panel-endpoints")).not.toBeNull();

    rerender(<OpenAPI openapi={asDoc(exampleDoc)} config={{ show: { endpoints: false } }} />);
    expect(document.getElementById("panel-endpoints")).toBeNull();
    expect(document.getElementById("panel-schemas")).not.toBeNull();
  });

  it("renders info-level x-* extensions (x-logo and catalog entries)", async () => {
    const doc = {
      ...(exampleDoc as Record<string, unknown>),
      info: {
        ...(exampleDoc.info as Record<string, unknown>),
        "x-logo": "https://example.com/logo.svg",
        "x-x": "@PetstoreAPI",
      },
    };
    render(<OpenAPI openapi={asDoc(doc)} />);

    // Rendered twice (once for the mobile lead position, once atop the
    // desktop sidebar), with only one visible per breakpoint via CSS.
    const logos = await screen.findAllByRole("img", { name: "logo" });
    expect(logos.length).toBeGreaterThan(0);
    for (const logo of logos) {
      expect(logo).toHaveAttribute("src", "https://example.com/logo.svg");
    }
    expect(await screen.findByRole("link", { name: /@PetstoreAPI on X/i })).toBeInTheDocument();
  });

  it("hides catalog extensions when show.extensions is false", () => {
    const doc = {
      ...(exampleDoc as Record<string, unknown>),
      info: {
        ...(exampleDoc.info as Record<string, unknown>),
        "x-x": "@PetstoreAPI",
      },
    };
    render(<OpenAPI openapi={asDoc(doc)} config={{ show: { extensions: false } }} />);

    expect(screen.queryByRole("link", { name: /@PetstoreAPI on X/i })).not.toBeInTheDocument();
  });

  it('self-heals when kind="resolved" is passed a document that still has $refs, and warns about the false promise', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<OpenAPI kind="resolved" openapi={asDoc(exampleDoc)} />);

      fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
      const bodyText = document.body.textContent ?? "";
      expect(bodyText).not.toContain("$ref");
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/kind="resolved".*still contains \$ref/));
    } finally {
      warn.mockRestore();
    }
  });

  it('does not warn for kind="resolved" parser output whose only quirk is object cycles', () => {
    const schema: Record<string, unknown> = { type: "object" };
    schema.properties = { self: schema };
    const doc = {
      openapi: "3.0.0",
      info: { title: "Cyclic API", version: "1.0.0" },
      components: { schemas: { schema } },
    };

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<OpenAPI kind="resolved" openapi={asDoc(doc)} />);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
