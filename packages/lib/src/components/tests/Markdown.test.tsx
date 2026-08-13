import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Markdown from "../Markdown";

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
});
