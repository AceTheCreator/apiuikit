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

  describe("OpenAPI security schemes", () => {
    it("routes an http/bearer scheme to a Bearer Token tab", () => {
      render(
        <Authorization securities={[{ type: "http", scheme: "bearer", bearerFormat: "JWT" } as never]} />,
      );

      expect(screen.getByText(/provide a bearer token/i)).toBeInTheDocument();
      expect(screen.getByText(/JWT/)).toBeInTheDocument();
    });

    it("routes an http/basic scheme onto the existing User/Password tab", () => {
      render(<Authorization securities={[{ type: "http", scheme: "basic" } as never]} />);

      expect(screen.getByText(/provide user and password/i)).toBeInTheDocument();
    });

    it("describes an OpenAPI-style apiKey (header placement + name) distinctly from the broker-style one", () => {
      render(
        <Authorization
          securities={[{ type: "apiKey", in: "header", name: "X-API-Key" } as never]}
        />,
      );

      expect(screen.getByText(/header parameter/i)).toBeInTheDocument();
      expect(screen.getByText("X-API-Key")).toBeInTheDocument();
    });

    it("still describes the AsyncAPI broker-style apiKey (user/password placement) correctly", () => {
      render(<Authorization securities={[{ type: "apiKey", in: "password" } as never]} />);

      expect(screen.getByText(/provide your API key as the password/i)).toBeInTheDocument();
    });

    it("reads OpenAPI's oauth2 flow `scopes` field (AsyncAPI names it `availableScopes`)", () => {
      render(
        <Authorization
          securities={[
            {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://example.com/authorize",
                  tokenUrl: "https://example.com/token",
                  scopes: { "read:pets": "Read pets", "write:pets": "Write pets" },
                },
              },
            } as never,
          ]}
        />,
      );

      expect(screen.getByText("read:pets")).toBeInTheDocument();
      expect(screen.getByText("write:pets")).toBeInTheDocument();
    });

    it("prefers requiredScopes over the flow's full scope catalog, and labels them as required", () => {
      render(
        <Authorization
          securities={[
            {
              type: "oauth2",
              requiredScopes: ["read:pets"],
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://example.com/authorize",
                  tokenUrl: "https://example.com/token",
                  scopes: { "read:pets": "Read pets", "write:pets": "Write pets", admin: "Full access" },
                },
              },
            } as never,
          ]}
        />,
      );

      expect(screen.getByText("read:pets")).toBeInTheDocument();
      expect(screen.queryByText("write:pets")).not.toBeInTheDocument();
      expect(screen.queryByText("admin")).not.toBeInTheDocument();
      expect(screen.getByText("Required scopes")).toBeInTheDocument();
    });

    it("falls back to the full scope catalog (labeled Available scopes) when no requiredScopes are given", () => {
      render(
        <Authorization
          securities={[
            {
              type: "oauth2",
              flows: {
                authorizationCode: {
                  authorizationUrl: "https://example.com/authorize",
                  tokenUrl: "https://example.com/token",
                  scopes: { "read:pets": "Read pets", "write:pets": "Write pets" },
                },
              },
            } as never,
          ]}
        />,
      );

      expect(screen.getByText("read:pets")).toBeInTheDocument();
      expect(screen.getByText("write:pets")).toBeInTheDocument();
      expect(screen.getByText("Available scopes")).toBeInTheDocument();
    });

    it("uses requiredScopes for OpenID too, since OpenAPI's OpenID scheme has no scope catalog of its own", () => {
      render(
        <Authorization
          securities={[
            {
              type: "openIdConnect",
              openIdConnectUrl: "https://example.com/.well-known/openid-configuration",
              requiredScopes: ["profile", "email"],
            } as never,
          ]}
        />,
      );

      expect(screen.getByText(/profile.*email/)).toBeInTheDocument();
      expect(screen.getByText("Required scopes")).toBeInTheDocument();
    });
  });
});
