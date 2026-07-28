import { fireEvent, render, screen } from "@testing-library/react";
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

  it("shows the tab bar with no method selected when there's more than one mechanism", () => {
    render(
      <Authorization
        securities={[{ type: "X509" } as never, { type: "gssapi" } as never]}
      />,
    );

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(
      screen.queryByText(/download the certificate file/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/authenticate using Kerberos/i),
    ).not.toBeInTheDocument();
  });

  it("expands method details on tab click and collapses them when the same tab is clicked again", () => {
    render(
      <Authorization
        securities={[{ type: "X509" } as never, { type: "gssapi" } as never]}
      />,
    );

    const tab = screen.getByRole("tab", { name: /X\.509 certificate/i });
    fireEvent.click(tab);

    expect(
      screen.getByText(/download the certificate file/i),
    ).toBeInTheDocument();

    fireEvent.click(tab);

    expect(
      screen.queryByText(/download the certificate file/i),
    ).not.toBeInTheDocument();
  });
});
