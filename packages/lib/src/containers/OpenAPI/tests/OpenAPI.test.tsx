import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
    expect(panel.getByText("List all pets")).toBeInTheDocument();
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

  it("opens an endpoint's detail panel with parameters and responses", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    fireEvent.click(screen.getByText("List all pets").closest("tr")!);
    const detail = within(document.getElementById("endpoint-get /pets-detail")!);
    expect(detail.getByText("List all pets")).toBeInTheDocument();
    expect(detail.getByText("limit")).toBeInTheDocument();
  });

  it("switches away from the active tab when a config change hides it", () => {
    const { rerender } = render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    expect(document.getElementById("panel-endpoints")).not.toBeNull();

    rerender(<OpenAPI openapi={asDoc(exampleDoc)} config={{ show: { endpoints: false } }} />);
    expect(document.getElementById("panel-endpoints")).toBeNull();
    expect(document.getElementById("panel-schemas")).not.toBeNull();
  });

  it('self-heals when kind="resolved" is passed a document that still has $refs', () => {
    render(<OpenAPI kind="resolved" openapi={asDoc(exampleDoc)} />);

    fireEvent.click(screen.getByRole("tab", { name: "Schemas" }));
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).not.toContain("$ref");
  });
});
