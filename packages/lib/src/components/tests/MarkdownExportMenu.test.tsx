import { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarkdownExportMenu from "../MarkdownExportMenu";
import { AsyncAPIDocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { MarkdownUrlResolver } from "../../config/config";

const specDocument = { info: { title: "Streetlights" } } as unknown as AsyncAPIDocumentData;

function makeProviders(markdownUrl?: MarkdownUrlResolver) {
  return function Providers({ children }: { children: ReactNode }) {
    return (
      <AsyncAPIDocumentContext.Provider
        value={{
          specType: "asyncapi",
          document: specDocument,
          deref: () => undefined,
          portalHost: document.body,
          rootElement: null,
          sidePanelContainment: "component",
          depthColors: DEFAULT_DEPTH_COLORS,
          showExtensions: true,
          showCodeSamples: true,
          markdownUrl,
        }}
      >
        {children}
      </AsyncAPIDocumentContext.Provider>
    );
  };
}

const renderMenu = (
  serialize = () => "# Hello",
  markdownUrl?: MarkdownUrlResolver,
  onOpenChange?: (isOpen: boolean) => void,
) =>
  render(<MarkdownExportMenu serialize={serialize} onOpenChange={onOpenChange} />, {
    wrapper: makeProviders(markdownUrl),
  });

describe("MarkdownExportMenu", () => {
  it("opens the menu on trigger click and closes on Escape", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("reports its open state to the shared document toolbar", () => {
    const onOpenChange = vi.fn();
    renderMenu(() => "# Hello", undefined, onOpenChange);
    onOpenChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("closes on outside click", () => {
    renderMenu();
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("copies the serialized markdown to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const serialize = vi.fn(() => "# Serialized Doc");

    renderMenu(serialize);
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Copy for LLM/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Serialized Doc"));
    expect(serialize).toHaveBeenCalled();
  });

  it("opens the serialized markdown as a blob in a new tab", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const open = vi.fn();
    vi.stubGlobal("open", open);

    renderMenu(() => "# Serialized Doc");
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("blob:mock-url", "_blank");
  });

  it("opens the configured hosted URL instead of building a blob", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const serialize = vi.fn(() => "# Serialized Doc");

    renderMenu(serialize, () => "/docs/api.md");
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    expect(open).toHaveBeenCalledWith("/docs/api.md", "_blank");
    expect(createObjectURL).not.toHaveBeenCalled();
    // Serialization is the expensive part, so a hosted URL should skip it.
    expect(serialize).not.toHaveBeenCalled();
  });

  it("passes the document-level target to the resolver", () => {
    vi.stubGlobal("open", vi.fn());
    const markdownUrl = vi.fn(() => "/docs/api.md");

    renderMenu(() => "# Doc", markdownUrl);
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    expect(markdownUrl).toHaveBeenCalledWith({ kind: "document", document: specDocument });
  });

  it("falls back to the blob when the resolver declines", () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const open = vi.fn();
    vi.stubGlobal("open", open);

    renderMenu(() => "# Serialized Doc", () => null);
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("blob:mock-url", "_blank");
  });

  it("still copies the serialized markdown when a hosted URL is configured", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    renderMenu(() => "# Serialized Doc", () => "/docs/api.md");
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Copy for LLM/ }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Serialized Doc"));
  });
});
