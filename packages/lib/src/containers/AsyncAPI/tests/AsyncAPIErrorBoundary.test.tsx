import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AsyncAPI from "../AsyncAPI";
import { AsyncAPIRenderer } from "../AsyncAPIRenderer";
import type { AsyncAPIDocumentData } from "../../../types/schema";
import exampleDoc from "../../../config/examples/streetlight.json";

// See the OpenAPI counterpart: mocking Layout is the only way to guarantee a
// render-time throw that doesn't depend on which malformed field happens to
// crash a given renderer today.
vi.mock("../Layout", () => ({
  default: () => {
    throw new Error("layout exploded");
  },
}));

describe("AsyncAPIRenderer error boundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards errorFallback and onError to the AsyncAPI boundary", async () => {
    const onError = vi.fn();
    render(
      <AsyncAPIRenderer
        raw={JSON.stringify(exampleDoc)}
        errorFallback={<div>renderer fallback</div>}
        onError={onError}
      />,
    );

    expect(await screen.findByText("renderer fallback")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].message).toBe("layout exploded");
  });

  it("catches a throw from document resolution, not just from the rendered tree", () => {
    // resolveDocument runs during render and walks the document, so a
    // pathological one can throw before Layout is ever reached. That happens
    // inside the boundary's child, which is what keeps it caught.
    const hostileDoc = {
      asyncapi: "3.0.0",
      info: { title: "Hostile", version: "1.0.0" },
      get channels(): never {
        throw new Error("resolution exploded");
      },
    } as unknown as AsyncAPIDocumentData;

    render(<AsyncAPI asyncapi={hostileDoc} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("resolution exploded")).toBeInTheDocument();
  });

  it("falls back to the built-in fallback when no errorFallback is given", async () => {
    render(<AsyncAPIRenderer raw={JSON.stringify(exampleDoc)} />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("layout exploded")).toBeInTheDocument();
  });
});
