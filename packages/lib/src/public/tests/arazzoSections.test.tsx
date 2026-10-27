import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ArazzoInfo,
  ArazzoProvider,
  ArazzoWorkflows,
  ArazzoWorkflowSection,
} from "../arazzoSections";
import { OpenAPIProvider } from "../openapiSections";
import openapiDoc from "../../config/examples/openapi-petstore.json";
import { adoptionFlows, petstoreSource } from "../../stories/arazzoExamples";
import { petCoupons } from "../../helpers/tests/fixtures/arazzo";
import type { OpenAPIDocumentData } from "../../types/openapi";

const sources = { petstore: petstoreSource };

/** Sections resolve asynchronously and load their bodies lazily. */
const findHeading = (name: string) => screen.findByRole("heading", { name }, { timeout: 5000 });

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Arazzo sections on their own", () => {
  it("ArazzoInfo shows the title and a chip per source", async () => {
    render(<ArazzoInfo document={adoptionFlows} sources={sources} />);

    await findHeading("Pet adoption");
    expect(document.getElementById("source-petstore")).toHaveTextContent("petstore");
    expect(screen.queryByRole("region", { name: /^Workflow / })).toBeNull();
  });

  it("ArazzoWorkflows shows the list and every workflow, steps linked to their source", async () => {
    render(<ArazzoWorkflows document={adoptionFlows} sources={sources} />);

    await findHeading("Add a pet and read it back");
    expect(screen.getByRole("region", { name: "Workflow add-pet" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Workflow add-and-remove" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add a pet, then remove it/ })).toBeInTheDocument();
    expect(screen.getAllByText("/pets").length).toBeGreaterThan(0);
  });

  it("ArazzoWorkflowSection shows only the workflow it names", async () => {
    render(<ArazzoWorkflowSection document={adoptionFlows} sources={sources} workflowId="add-and-remove" />);

    await findHeading("Add a pet, then remove it");
    expect(screen.queryByRole("region", { name: "Workflow add-pet" })).toBeNull();
  });

  it("ArazzoWorkflowSection renders nothing and warns for a workflow the document doesn't have", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { container } = render(<ArazzoWorkflowSection document={adoptionFlows} sources={sources} workflowId="nope" />);

    await waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringMatching(/no workflow "nope"/)), { timeout: 5000 });
    expect(container.querySelector("section")).toBeNull();
  });

  it("reads the document and sources from YAML text", async () => {
    render(<ArazzoWorkflowSection document={petCoupons.arazzo} sources={petCoupons.sources} workflowId="place-order" />);

    await findHeading("Place an order for a pet.");
    expect(screen.getAllByText("/store/order").length).toBeGreaterThan(0);
  });

  it("reports diagnostics, here the source it wasn't given", async () => {
    const onDiagnostics = vi.fn();
    render(<ArazzoInfo document={adoptionFlows} onDiagnostics={onDiagnostics} />);

    await findHeading("Pet adoption");
    expect(onDiagnostics).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining("petstore") })]),
    );
  });

  it("throws without a document or a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ArazzoInfo />)).toThrow(/needs a `document` prop/);
  });
});

describe("Arazzo sections under ArazzoProvider", () => {
  it("share one resolved document", async () => {
    const onDiagnostics = vi.fn();
    render(
      <ArazzoProvider document={adoptionFlows} sources={sources} onDiagnostics={onDiagnostics}>
        <ArazzoInfo />
        <ArazzoWorkflowSection workflowId="add-pet" />
      </ArazzoProvider>,
    );

    await findHeading("Add a pet and read it back");
    expect(screen.getByRole("heading", { name: "Pet adoption" })).toBeInTheDocument();
    // Resolved once for both sections.
    expect(onDiagnostics).toHaveBeenCalledTimes(1);
    // One themed root around both, not one each.
    expect(document.querySelectorAll(".apiuikit-root")).toHaveLength(1);
  });

  it("ignore their own document prop", async () => {
    const other = { ...adoptionFlows, info: { ...adoptionFlows.info, title: "Other flows" } };
    render(
      <ArazzoProvider document={adoptionFlows} sources={sources}>
        <ArazzoInfo document={other} />
      </ArazzoProvider>,
    );

    await findHeading("Pet adoption");
    expect(screen.queryByRole("heading", { name: "Other flows" })).toBeNull();
  });
});

describe("Arazzo sections under another spec's provider", () => {
  const openapi = openapiDoc as unknown as OpenAPIDocumentData;

  it("warn and fall back to their own document", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <OpenAPIProvider document={openapi}>
        <ArazzoInfo document={adoptionFlows} sources={sources} />
      </OpenAPIProvider>,
    );

    await findHeading("Pet adoption");
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Arazzo section.*openapi document provider.*own `document` prop instead/));
  });

  it("warn and render nothing without one", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <OpenAPIProvider document={openapi}>
        <ArazzoWorkflows />
      </OpenAPIProvider>,
    );

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/Wrap it in <ArazzoProvider>/));
    expect(screen.queryByRole("region", { name: /^Workflow / })).toBeNull();
  });
});
