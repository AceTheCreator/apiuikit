import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Authorization from "../Authorization";

describe("Authorization", () => {
  it("hides the tab bar and shows only the content when there's a single mechanism", () => {
    render(<Authorization securities={[{ type: "X509" } as never]} />);

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(
      screen.getByText(/download the certificate file/i),
    ).toBeInTheDocument();
  });

  it("shows the tab bar when there's more than one mechanism", () => {
    render(
      <Authorization
        securities={[{ type: "X509" } as never, { type: "gssapi" } as never]}
      />,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
