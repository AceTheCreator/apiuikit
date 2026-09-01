import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { ChannelAddress } from "../ChannelAddress";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";

/** ChannelAddress reads `portalHost` off the document context for its parameter tooltips. */
function renderAddress(node: ReactNode, portalHost: HTMLElement | null = null) {
  return render(
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document: { openapi: "3.0.3", info: { title: "Test API", version: "1.0.0" } },
        deref: () => undefined,
        portalHost,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
      }}
    >
      {node}
    </DocumentContext.Provider>,
  );
}

const code = (container: HTMLElement) => container.querySelector("code")!;

/**
 * jsdom reports every element as 0×0, so `scrollWidth > clientWidth` is never
 * true and the ellipsis would never appear. Stub the pair to stand in for a
 * clipped address (or one that fits, at equal widths).
 */
function stubOverflow(overflowing: boolean) {
  for (const [property, value] of [
    ["scrollWidth", overflowing ? 500 : 100],
    ["clientWidth", 100],
  ] as const) {
    vi.spyOn(HTMLElement.prototype, property, "get").mockReturnValue(value);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChannelAddress", () => {
  it("carries its own padding by default", () => {
    const { container } = renderAddress(<ChannelAddress address="/sites/{site_id}" />);
    expect(code(container).className).toContain("px-2");
    expect(code(container).className).toContain("py-1");
  });

  /**
   * The nav needs an unpadded address to sit flush with its Servers rows. It
   * cannot get there with a `p-0` in `className`, because Tailwind emits
   * `.px-2`/`.py-1` after `.p-0` and same-specificity conflicts resolve on
   * source order, so the padding would win. Hence the prop.
   */
  it("drops its padding entirely when padded is false", () => {
    const { container } = renderAddress(<ChannelAddress address="/sites/{site_id}" padded={false} />);
    expect(code(container).className).not.toContain("px-2");
    expect(code(container).className).not.toContain("py-1");
  });

  it("wraps long addresses by default", () => {
    const { container } = renderAddress(<ChannelAddress address="/sites/{site_id}/database" />);
    expect(code(container).className).toContain("break-all");
  });

  it("clips to a single line when truncate is set, rather than wrapping", () => {
    const { container } = renderAddress(
      <ChannelAddress address="/sites/{site_id}/database/branch/{branch_id}/compute/settings" truncate />,
    );
    expect(code(container).className).not.toContain("break-all");
    expect(container.querySelector(".whitespace-nowrap")).toBeInTheDocument();
  });

  it("still renders every address segment when unpadded and truncated", () => {
    const { container } = renderAddress(
      <ChannelAddress address="/sites/{site_id}/env" truncate padded={false} />,
    );
    expect(container.textContent).toContain("/sites/");
    expect(container.textContent).toContain("{site_id}");
    expect(container.textContent).toContain("/env");
  });

  describe("the full-address peek", () => {
    const longAddress = "/v1/sites/{site_id}/branches/{branch_id}/compute/settings";

    it("offers no ellipsis when the address already fits", () => {
      stubOverflow(false);
      renderAddress(<ChannelAddress address={longAddress} truncate peek />);
      expect(screen.queryByRole("button", { name: "Show full address" })).not.toBeInTheDocument();
    });

    it("offers the ellipsis once the address is clipped", () => {
      stubOverflow(true);
      renderAddress(<ChannelAddress address={longAddress} truncate peek />);
      expect(screen.getByRole("button", { name: "Show full address" })).toBeInTheDocument();
    });

    /**
     * Most truncating callers (table rows, nav items) are themselves clickable,
     * so an interactive ellipsis inside them would nest one control in another
     * and add a tab stop per row. Without `peek` it stays decorative.
     */
    it("leaves the ellipsis decorative unless peek is set", () => {
      stubOverflow(true);
      const { container } = renderAddress(<ChannelAddress address={longAddress} truncate />);
      expect(screen.queryByRole("button", { name: "Show full address" })).not.toBeInTheDocument();
      expect(container.querySelector("[tabindex]")).not.toBeInTheDocument();
      expect(container.textContent).toContain("…");
    });

    it("reveals the whole address on hover, and hides it again on leave", async () => {
      stubOverflow(true);
      const user = userEvent.setup();
      const portalHost = document.createElement("div");
      document.body.appendChild(portalHost);
      renderAddress(<ChannelAddress address={longAddress} truncate peek />, portalHost);

      const ellipsis = screen.getByRole("button", { name: "Show full address" });
      await user.hover(ellipsis);

      const peek = screen.getByRole("tooltip");
      expect(peek).toHaveTextContent("/v1/sites/");
      expect(peek).toHaveTextContent("{branch_id}");
      expect(peek).toHaveTextContent("/compute/settings");

      await user.unhover(ellipsis);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("reveals the whole address on keyboard focus too", async () => {
      stubOverflow(true);
      const user = userEvent.setup();
      const portalHost = document.createElement("div");
      document.body.appendChild(portalHost);
      renderAddress(<ChannelAddress address={longAddress} truncate peek />, portalHost);

      await user.tab();
      expect(screen.getByRole("button", { name: "Show full address" })).toHaveFocus();
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
  });
});
