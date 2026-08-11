import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Section from "../Section";

describe("Section layout", () => {
  it("reserves the right column by default (columns)", () => {
    render(<Section content={<div>main</div>} stickySideContent={false} />);
    expect(screen.getByTestId("section-side-column")).toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
  });

  it("omits the reserved right column when layout is stacked and there is no side content", () => {
    const { container } = render(
      <Section content={<div>main</div>} stickySideContent={false} layout="stacked" />,
    );
    expect(screen.queryByTestId("section-side-column")).not.toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    // stacked must stay full-width — a prose max-width here would clip long
    // operation / path addresses in standalone embeds once @lg applies.
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toMatch(/max-w-prose/);
    expect(root.className).not.toMatch(/max-w-\[/);
  });

  it("stacks side content below main content when layout is stacked", () => {
    const { container } = render(
      <Section
        content={<div>main</div>}
        sideContent={<div>side</div>}
        stickySideContent={false}
        reverseLayoutOnMobile={true}
        layout="stacked"
      />,
    );
    expect(screen.queryByTestId("section-side-column")).not.toBeInTheDocument();
    expect(screen.getByText("main")).toBeInTheDocument();
    expect(screen.getByText("side")).toBeInTheDocument();
    const section = container.querySelector("section")!;
    expect(section.firstElementChild).toContainElement(screen.getByText("main"));
    expect(section.lastElementChild).toContainElement(screen.getByText("side"));
  });

  it("keeps the reserved right column in columns mode even when side content is present", () => {
    render(
      <Section
        content={<div>main</div>}
        sideContent={<div>side</div>}
        stickySideContent={true}
        layout="columns"
      />,
    );
    expect(screen.getByTestId("section-side-column")).toBeInTheDocument();
    expect(screen.getByText("side")).toBeInTheDocument();
  });
});
