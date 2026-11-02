import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Markdown from "../Markdown";

const RAW_HTML = 'Hello <b>world</b>\n\n<img src="x" onerror="alert(1)">';

describe("Markdown", () => {
  it("maps prose body and headings to semantic theme colors", () => {
    const { container } = render(
      <Markdown>{"Body copy\n\n### Visible heading"}</Markdown>,
    );

    const prose = container.firstElementChild as HTMLElement;
    expect(prose.style.getPropertyValue("--tw-prose-body")).toBe(
      "rgb(var(--color-text-secondary) / 1)",
    );
    expect(prose.style.getPropertyValue("--tw-prose-headings")).toBe(
      "rgb(var(--color-text-primary) / 1)",
    );
    expect(screen.getByRole("heading", { level: 3, name: "Visible heading" })).toBeInTheDocument();
  });

  it("sanitizes raw HTML with DOMPurify in the browser", () => {
    const { container } = render(<Markdown>{RAW_HTML}</Markdown>);

    expect(container.querySelector("b")).toHaveTextContent("world");
    expect(container.querySelector("img")).not.toHaveAttribute("onerror");
  });

  it("server-renders raw HTML as text, with no tags", () => {
    const html = renderToString(<Markdown>{RAW_HTML}</Markdown>);

    expect(html).toContain("world");
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("<img");
  });

  it("hydrates server HTML without a mismatch, then renders the sanitized HTML", async () => {
    const element = <Markdown>{RAW_HTML}</Markdown>;
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.appendChild(container);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const onRecoverableError = vi.fn();

    try {
      await act(async () => {
        hydrateRoot(container, element, { onRecoverableError });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      expect(container.querySelector("b")).toHaveTextContent("world");
      expect(container.querySelector("img")).not.toHaveAttribute("onerror");
    } finally {
      consoleError.mockRestore();
      container.remove();
    }
  });
});
