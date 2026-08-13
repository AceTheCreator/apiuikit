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

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      const copied = writeText.mock.calls[0][0] as string;
      expect(copied).toContain("> ## Agent Instructions");
      expect(copied).toContain("# Serialized Doc");
    });
    expect(serialize).toHaveBeenCalled();
  });

  it("opens the serialized markdown as a blob in a new tab", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const open = vi.fn();
    vi.stubGlobal("open", open);

    renderMenu(() => "# Serialized Doc");
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain("> ## Agent Instructions");
    expect(await blob.text()).toContain("# Serialized Doc");
    expect(open).toHaveBeenCalledWith("blob:mock-url", "_blank");
  });

  it("opens a blob even when a hosted URL is configured", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:mock-url");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const open = vi.fn();
    vi.stubGlobal("open", open);
    const serialize = vi.fn(() => "# Serialized Doc");

    renderMenu(serialize, () => "/docs/api.md");
    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    fireEvent.click(screen.getByRole("menuitem", { name: /View as Markdown/ }));

    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.text()).toContain("> ## Agent Instructions");
    expect(await blob.text()).toContain("# Serialized Doc");
    expect(open).toHaveBeenCalledWith("blob:mock-url", "_blank");
    expect(serialize).toHaveBeenCalled();
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

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled();
      const copied = writeText.mock.calls[0][0] as string;
      expect(copied).toContain("> ## Agent Instructions");
      expect(copied).toContain("# Serialized Doc");
    });
  });
});
