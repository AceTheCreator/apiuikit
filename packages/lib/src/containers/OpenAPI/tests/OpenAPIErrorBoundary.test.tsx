import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAPI from "../OpenAPI";
import { OpenAPIRenderer } from "../OpenAPIRenderer";
import type { OpenAPIDocumentData } from "../../../types/openapi";
import exampleDoc from "../../../config/examples/openapi-petstore.json";

// The document itself is valid: what's under test is that a throw from
// anywhere inside the OpenAPI tree is contained by the container's boundary
// rather than escaping into the host application. Mocking Layout is the one
// way to guarantee a render-time throw without depending on whichever
// malformed field happens to crash a given renderer today.
vi.mock("../Layout", () => ({
  default: () => {
    throw new Error("layout exploded");
  },
}));

const asDoc = (doc: unknown) => doc as OpenAPIDocumentData;

describe("OpenAPI error boundary", () => {
  beforeEach(() => {
    // React logs caught render errors to console.error regardless.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("catches a render error and shows the default fallback instead of crashing", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("layout exploded")).toBeInTheDocument();
  });

  it("renders a custom errorFallback", () => {
    render(<OpenAPI openapi={asDoc(exampleDoc)} errorFallback={<div>custom openapi fallback</div>} />);

    expect(screen.getByText("custom openapi fallback")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("calls onError with the caught error", () => {
    const onError = vi.fn();
    render(<OpenAPI openapi={asDoc(exampleDoc)} onError={onError} />);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onError.mock.calls[0][0].message).toBe("layout exploded");
  });

  it("catches a throw from document resolution, not just from the rendered tree", () => {
    // resolveDocument runs during render and walks the document, so a
    // pathological one can throw before Layout is ever reached. That happens
    // inside the boundary's child, which is what keeps it caught.
    const hostileDoc = {
      openapi: "3.0.3",
      info: { title: "Hostile", version: "1.0.0" },
      get paths(): never {
        throw new Error("resolution exploded");
      },
    };

    render(<OpenAPI openapi={asDoc(hostileDoc)} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("resolution exploded")).toBeInTheDocument();
  });

  it("forwards errorFallback and onError through OpenAPIRenderer", async () => {
    const onError = vi.fn();
    render(
      <OpenAPIRenderer
        raw={JSON.stringify(exampleDoc)}
        errorFallback={<div>renderer fallback</div>}
        onError={onError}
      />,
    );

    expect(await screen.findByText("renderer fallback")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
