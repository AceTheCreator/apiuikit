import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import CodeBlock from "../CodeBlock";

/**
 * jsdom reports every scrollHeight as 0, so the height cap can only be
 * exercised by stubbing it. Each test declares the content height it wants the
 * block to believe it has.
 */
function stubScrollHeight(px: number) {
  Object.defineProperty(HTMLPreElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => px,
  });
}

afterEach(() => {
  // Reflect rather than `delete`, which TS rejects on a readonly DOM property.
  Reflect.deleteProperty(HTMLPreElement.prototype, "scrollHeight");
});

const code = Array.from({ length: 40 }, (_, i) => `"line": ${i}`).join("\n");

describe("CodeBlock height cap", () => {
  it("leaves a block that fits uncapped, with no toggle", () => {
    stubScrollHeight(120);
    render(<CodeBlock code={code} collapsedMaxHeight={320} />);

    expect(screen.queryByRole("button", { name: /show/i })).not.toBeInTheDocument();
    expect(document.querySelector("pre")).not.toHaveStyle({ maxHeight: "320px" });
  });

  it("renders a block only slightly over the cap in full rather than clipping a line or two", () => {
    stubScrollHeight(360); // within the 48px slack
    render(<CodeBlock code={code} collapsedMaxHeight={320} />);

    expect(screen.queryByRole("button", { name: /show/i })).not.toBeInTheDocument();
  });

  it("caps a long block and offers a toggle naming the full line count", () => {
    stubScrollHeight(900);
    render(<CodeBlock code={code} collapsedMaxHeight={320} />);

    const toggle = screen.getByRole("button", { name: "Show all 40 lines" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector("pre")).toHaveStyle({ maxHeight: "320px" });
  });

  it("removes the cap once expanded and restores it on collapse", () => {
    stubScrollHeight(900);
    render(<CodeBlock code={code} collapsedMaxHeight={320} />);

    fireEvent.click(screen.getByRole("button", { name: "Show all 40 lines" }));
    const expandedToggle = screen.getByRole("button", { name: "Show less" });
    expect(expandedToggle).toHaveAttribute("aria-expanded", "true");
    expect(document.querySelector("pre")).not.toHaveStyle({ maxHeight: "320px" });

    fireEvent.click(expandedToggle);
    expect(screen.getByRole("button", { name: "Show all 40 lines" })).toBeInTheDocument();
    expect(document.querySelector("pre")).toHaveStyle({ maxHeight: "320px" });
  });

  it("points the toggle at the block it controls", () => {
    stubScrollHeight(900);
    render(<CodeBlock code={code} collapsedMaxHeight={320} />);

    const controls = screen
      .getByRole("button", { name: "Show all 40 lines" })
      .getAttribute("aria-controls");
    expect(document.querySelector("pre")).toHaveAttribute("id", controls);
  });
});
