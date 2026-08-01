import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PathOperation from "../PathOperation";
import { DocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../../components/schema/depthColors";
import type { OpenAPIOperationData, OpenAPISecuritySchemeData } from "../../../types/openapi";

const baseOp: OpenAPIOperationData = {
  summary: "List pets",
  security: [{ apiKeyAuth: [] }],
};

// PathOperation renders ChannelAddress, which reads the shared document
// context (for its hover-tooltip portal) — a minimal provider is enough for
// these tests, which don't exercise that portal.
function withContext(children: React.ReactNode) {
  return (
    <DocumentContext.Provider
      value={{
        document: {},
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

describe("PathOperation security", () => {
  it("renders no detail panel with no securitySchemes provided", () => {
    render(withContext(<PathOperation method="get" path="/pets" op={baseOp} id="get /pets" />));

    expect(screen.queryByText(/header parameter/i)).not.toBeInTheDocument();
  });

  it("resolves the requirement against securitySchemes and renders the actual scheme detail", () => {
    const securitySchemes: Record<string, OpenAPISecuritySchemeData> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" } as OpenAPISecuritySchemeData,
    };

    render(
      withContext(
        <PathOperation
          method="get"
          path="/pets"
          op={baseOp}
          id="get /pets"
          securitySchemes={securitySchemes}
        />,
      ),
    );

    expect(screen.getByText(/header parameter/i)).toBeInTheDocument();
    expect(screen.getByText("X-API-Key")).toBeInTheDocument();
  });

  it("doesn't render a detail panel for a requirement whose scheme name isn't in securitySchemes", () => {
    render(
      withContext(
        <PathOperation
          method="get"
          path="/pets"
          op={baseOp}
          id="get /pets"
          securitySchemes={{ someOtherScheme: { type: "apiKey", in: "header", name: "X" } as OpenAPISecuritySchemeData }}
        />,
      ),
    );

    expect(screen.queryByText(/header parameter/i)).not.toBeInTheDocument();
  });

  it("passes the operation's required scopes through to the rendered detail (not the scheme's full catalog)", () => {
    const opWithScopes: OpenAPIOperationData = {
      summary: "List pets",
      security: [{ oauth2: ["read:pets"] }],
    };
    const securitySchemes: Record<string, OpenAPISecuritySchemeData> = {
      oauth2: {
        type: "oauth2",
        flows: {
          authorizationCode: {
            authorizationUrl: "https://example.com/authorize",
            tokenUrl: "https://example.com/token",
            scopes: { "read:pets": "Read pets", "write:pets": "Write pets" },
          },
        },
      } as OpenAPISecuritySchemeData,
    };

    render(
      withContext(
        <PathOperation
          method="get"
          path="/pets"
          op={opWithScopes}
          id="get /pets"
          securitySchemes={securitySchemes}
        />,
      ),
    );

    expect(screen.getByText("read:pets")).toBeInTheDocument();
    expect(screen.queryByText("write:pets")).not.toBeInTheDocument();
    expect(screen.getByText("Required scopes")).toBeInTheDocument();
  });
});

describe("PathOperation responses", () => {
  const opWithResponses: OpenAPIOperationData = {
    summary: "List pets",
    responses: {
      "200": {
        description: "A list of pets",
        content: { "application/json": { schema: { type: "array", items: {} } } },
      },
      "404": {
        description: "No pets found",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };

  it("shows the first response's content by default, as a tab per status", () => {
    render(withContext(<PathOperation method="get" path="/pets" op={opWithResponses} id="get /pets" />));

    expect(screen.getByRole("button", { name: "200" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("A list of pets")).toBeInTheDocument();
    expect(screen.queryByText("No pets found")).not.toBeInTheDocument();
  });

  it("switches to the other status's content when its tab is clicked", () => {
    render(withContext(<PathOperation method="get" path="/pets" op={opWithResponses} id="get /pets" />));

    fireEvent.click(screen.getByRole("button", { name: "404" }));

    expect(screen.getByText("No pets found")).toBeInTheDocument();
    expect(screen.queryByText("A list of pets")).not.toBeInTheDocument();
  });

  it("only ever shows one status's content at a time (not every response stacked as its own card)", () => {
    const { container } = render(
      withContext(<PathOperation method="get" path="/pets" op={opWithResponses} id="get /pets" />),
    );

    // Both status labels appear once each — as tab buttons — with no second,
    // stacked-card copy of either elsewhere in the tree.
    expect(within(container).getAllByText("200")).toHaveLength(1);
    expect(within(container).getAllByText("404")).toHaveLength(1);
  });
});
