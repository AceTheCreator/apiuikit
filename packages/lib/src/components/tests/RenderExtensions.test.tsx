import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RenderExtensions } from "../RenderExtensions";
import { AsyncAPIDocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";

function withContext(showExtensions: boolean, children: React.ReactNode) {
  return (
    <AsyncAPIDocumentContext.Provider
      value={{
        document: {},
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions,
      }}
    >
      {children}
    </AsyncAPIDocumentContext.Provider>
  );
}

describe("RenderExtensions", () => {
  it("lazily renders a known x-* extension (x-x) once its module loads", async () => {
    render(
      withContext(
        true,
        <RenderExtensions source={{ "x-x": "@AsyncAPISpec" }} pathPrefix="info" />,
      ),
    );
    const link = await screen.findByRole("link", { name: /@AsyncAPISpec on X/i });
    expect(link).toHaveAttribute("href", "https://x.com/AsyncAPISpec");
  });

  it("renders nothing when showExtensions is false, even for a known key", () => {
    render(
      withContext(
        false,
        <RenderExtensions source={{ "x-x": "@AsyncAPISpec" }} pathPrefix="info" />,
      ),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing for an unrecognized x-* key", () => {
    render(
      withContext(
        true,
        <RenderExtensions source={{ "x-unknown-thing": "value" }} pathPrefix="info" />,
      ),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("ignores the library's own internal x-parser-*/x-lib-* markers", () => {
    render(
      withContext(
        true,
        <RenderExtensions
          source={{ "x-parser-schema-id": "light", "x-lib-conversion-error": "oops" }}
          pathPrefix="info"
        />,
      ),
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
