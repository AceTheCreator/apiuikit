import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { CodeSamples } from "../CodeSamples";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";
import type { OpenAPIDocumentData } from "../../types/openapi";

const testDocument: OpenAPIDocumentData = {
  openapi: "3.0.3",
  info: { title: "Test API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com/v1" }],
  components: {
    securitySchemes: {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
  },
};

const PANEL_ID = "endpoint-get /pets/{petId}-code-samples";

function withContext(showCodeSamples: boolean, children: ReactNode) {
  return (
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document: testDocument,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

const renderCodeSamples = (showCodeSamples = true) =>
  render(
    withContext(
      showCodeSamples,
      <CodeSamples
        method="get"
        path="/pets/{petId}"
        parameters={[{ name: "petId", in: "path", required: true, example: "abc-123" }]}
        security={[{ apiKeyAuth: [] }]}
        id="get /pets/{petId}"
      />,
    ),
  );

describe("CodeSamples", () => {
  it("renders the agent prompt by default with the resolved URL and auth header", () => {
    renderCodeSamples();

    const panel = within(document.getElementById(PANEL_ID)!);
    expect(panel.getByText("https://api.example.com/v1/pets/abc-123", { exact: false })).toBeInTheDocument();
    expect(panel.getByText("X-API-Key", { exact: false })).toBeInTheDocument();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    expect(select).toHaveValue("agent:prompt");
  });

  it("switches from the default agent prompt to curl", () => {
    renderCodeSamples();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "shell:curl" } });

    const code = document.getElementById(PANEL_ID)!.querySelector("code")!;
    expect(code.textContent).toContain("curl");
    expect(code.textContent).toContain("https://api.example.com/v1/pets/abc-123");
  });

  it("lists every httpsnippet target as a grouped dropdown option, not just curl/JS/Python", () => {
    renderCodeSamples();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    expect(within(select).getByRole("group", { name: "Go" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "NewRequest" })).toHaveValue("go:native");
    expect(within(select).getAllByRole("option", { name: "Axios" }).length).toBeGreaterThan(0);
    expect(within(select).getByRole("group", { name: "Python" })).toBeInTheDocument();
  });

  it("switches to Python (already-registered grammar) and shows a Python snippet", () => {
    renderCodeSamples();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "python:requests" } });

    // Syntax highlighting splits the snippet across multiple <span> nodes, so
    // getByText can't match the phrase in one go — assert on textContent instead.
    const code = document.getElementById(PANEL_ID)!.querySelector("code")!;
    expect(code.textContent).toContain("import requests");
  });

  it("switches to a lazily-loaded language (Go) and highlights it once the grammar loads", async () => {
    renderCodeSamples();

    const select = screen.getByRole("combobox", { name: "Code sample language" });
    fireEvent.change(select, { target: { value: "go:native" } });

    const code = document.getElementById(PANEL_ID)!.querySelector("code")!;
    expect(code.textContent).toContain("net/http");

    await waitFor(() => {
      expect(code.className).toContain("language-go");
      expect(code.querySelector("span")).not.toBeNull();
    });
  });

  it("renders nothing when showCodeSamples is false", () => {
    renderCodeSamples(false);
    expect(document.getElementById(PANEL_ID)).toBeNull();
  });
});
