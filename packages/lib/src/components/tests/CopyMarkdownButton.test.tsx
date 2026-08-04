import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CopyMarkdownButton from "../CopyMarkdownButton";

describe("CopyMarkdownButton", () => {
  it("copies the built markdown to the clipboard on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const getMarkdown = vi.fn(() => "# Endpoint Doc");

    render(<CopyMarkdownButton getMarkdown={getMarkdown} label="Copy endpoint for LLM" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy endpoint for LLM" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("# Endpoint Doc"));
    expect(getMarkdown).toHaveBeenCalled();
  });

  it("exposes the label as both title and aria-label", () => {
    render(<CopyMarkdownButton getMarkdown={() => ""} label="Copy endpoint for LLM" />);
    const button = screen.getByRole("button", { name: "Copy endpoint for LLM" });
    expect(button).toHaveAttribute("title", "Copy endpoint for LLM");
  });
});
