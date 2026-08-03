import { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarkdownExportMenu from "../MarkdownExportMenu";
import { AsyncAPIDocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";
import type { AsyncAPIDocumentData } from "../../types/schema";

function Providers({ children }: { children: ReactNode }) {
  return (
    <AsyncAPIDocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: {} as AsyncAPIDocumentData,
        deref: () => undefined,
        portalHost: document.body,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
      }}
    >
      {children}
    </AsyncAPIDocumentContext.Provider>
  );
}

const renderMenu = (serialize = () => "# Hello") =>
  render(<MarkdownExportMenu serialize={serialize} leftOffset={60} />, { wrapper: Providers });

describe("MarkdownExportMenu", () => {
  it("opens the menu on trigger click and closes on Escape", () => {
    renderMenu();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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
});
