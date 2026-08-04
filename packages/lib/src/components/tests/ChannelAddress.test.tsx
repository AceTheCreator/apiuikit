import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import { ChannelAddress } from "../ChannelAddress";
import { DocumentContext } from "../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../schema/depthColors";

/** ChannelAddress reads `portalHost` off the document context for its parameter tooltips. */
function renderAddress(node: ReactNode) {
  return render(
    <DocumentContext.Provider
      value={{
        specType: "openapi",
        document: { openapi: "3.0.3", info: { title: "Test API", version: "1.0.0" } },
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
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
});
