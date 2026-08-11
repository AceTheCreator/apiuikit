import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PathOperation from "../PathOperation";
import { DocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../../../components/schema/depthColors";
import type { OpenAPIDocumentData, OpenAPIOperationData, OpenAPISecuritySchemeData } from "../../../types/openapi";

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
        specType: "openapi",
        document: {} as OpenAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        sidePanelContainment: "component",
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
        showCodeSamples: true,
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

    expect(screen.getByRole("tab", { name: "200" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "404" })).toBeInTheDocument();
    expect(screen.getByText("A list of pets")).toBeInTheDocument();
    expect(screen.queryByText("No pets found")).not.toBeInTheDocument();
  });

  it("switches to the other status's content when its tab is clicked", () => {
    render(withContext(<PathOperation method="get" path="/pets" op={opWithResponses} id="get /pets" />));

    fireEvent.click(screen.getByRole("tab", { name: "404" }));

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

describe("PathOperation callbacks", () => {
  // Mirrors the torture example's /orders POST.
  const opWithCallbacks: OpenAPIOperationData = {
    summary: "Create an order",
    responses: { "202": { description: "Accepted" } },
    callbacks: {
      orderStatusChanged: {
        "{$request.body#/callbackUrl}": {
          post: {
            summary: "Order status callback",
            requestBody: {
              content: { "application/json": { schema: { type: "object" } } },
            },
            responses: { "200": { description: "Callback accepted" } },
          },
        },
      },
    },
  };

  it("joins the exchange strip as its own tab, framed as a request the API sends out", () => {
    render(withContext(<PathOperation method="post" path="/orders" op={opWithCallbacks} id="post /orders" />));

    fireEvent.click(screen.getByRole("tab", { name: "callbacks" }));

    // The tab label carries the heading, so the panel only adds the part a
    // reader can't infer: which way the request travels.
    expect(screen.getByText(/Requests the API sends to you/)).toBeInTheDocument();
    expect(screen.getByText("orderStatusChanged")).toBeInTheDocument();
    // The URL template's embedded expression reads as a plain path.
    expect(screen.getByText("{request.body.callbackUrl}")).toBeInTheDocument();
  });

  it("renders the callback's own operation through the full operation view once expanded", () => {
    render(withContext(<PathOperation method="post" path="/orders" op={opWithCallbacks} id="post /orders" />));

    fireEvent.click(screen.getByRole("tab", { name: "callbacks" }));
    // Each callback is collapsed within the tab, so expand it too.
    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Order status callback")).toBeInTheDocument();

    // The nested operation gets the full view, its own Request/Response strip
    // included. It opens on Request (it has a body), so its responses are one
    // click away, under the last Response tab in the tree.
    const responseTabs = screen.getAllByRole("tab", { name: "response" });
    fireEvent.click(responseTabs[responseTabs.length - 1]);
    expect(screen.getByText("Callback accepted")).toBeInTheDocument();
  });

  it("gives the nested operation its own anchor id, distinct from the parent's", () => {
    render(withContext(<PathOperation method="post" path="/orders" op={opWithCallbacks} id="post /orders" />));
    fireEvent.click(screen.getByRole("tab", { name: "callbacks" }));
    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(
      // The URL's position is in the id too, so one callback name with
      // several destinations doesn't produce colliding anchors.
      document.getElementById("callback-post /orders-orderStatusChanged-0-post-detail"),
    ).not.toBeNull();
  });

  it("stops expanding a callback that declares callbacks of its own", () => {
    const nested: OpenAPIOperationData = {
      responses: {},
      callbacks: {
        outer: {
          "{$request.body#/url}": {
            post: {
              summary: "Outer callback",
              responses: {},
              callbacks: {
                inner: {
                  "{$request.body#/url}": { post: { summary: "Inner callback", responses: {} } },
                },
              },
            },
          },
        },
      },
    };

    render(withContext(<PathOperation method="post" path="/x" op={nested} id="post /x" />));
    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("Outer callback")).toBeInTheDocument();
    // The nested operation renders, but its own callbacks section does not.
    expect(screen.queryByText("inner")).not.toBeInTheDocument();
  });

  it("lists one card per callback operation, titled with its method, name and destination", () => {
    // A callback name maps to many URL expressions, and each is a Path Item
    // that can carry several methods, so one callback can carry several
    // request bodies even though a single operation only ever has one. The
    // spec's two-level nesting is flattened so each gets its own card.
    const multi: OpenAPIOperationData = {
      responses: {},
      callbacks: {
        orderEvents: {
          "{$request.body#/primaryUrl}": {
            post: {
              summary: "Primary callback",
              requestBody: { content: { "application/json": { schema: { type: "object" } } } },
              responses: {},
            },
            put: {
              summary: "Primary replay",
              requestBody: { content: { "application/json": { schema: { type: "object" } } } },
              responses: {},
            },
          },
          "{$request.body#/backupUrl}": {
            post: {
              summary: "Backup callback",
              requestBody: { content: { "application/json": { schema: { type: "object" } } } },
              responses: {},
            },
          },
        },
      },
    };

    render(withContext(<PathOperation method="post" path="/orders" op={multi} id="post /orders" />));

    const cards = screen.getAllByRole("button", { expanded: false });
    expect(cards).toHaveLength(3);
    // Methods come in HTTP_METHODS order (the spec's own Path Item field
    // order), so put precedes post. MethodBadge uppercases via CSS, so the
    // text nodes themselves stay lowercase.
    expect(cards[0]).toHaveTextContent(/put.*orderEvents.*\{request\.body\.primaryUrl\}/);
    expect(cards[1]).toHaveTextContent(/post.*orderEvents.*\{request\.body\.primaryUrl\}/);
    expect(cards[2]).toHaveTextContent(/post.*orderEvents.*\{request\.body\.backupUrl\}/);
  });

  it("gives two methods on one destination a card each, opened independently", () => {
    // Two methods on one URL means two request bodies. Each gets its own
    // titled card, so neither runs into the other.
    const twoMethods: OpenAPIOperationData = {
      responses: {},
      callbacks: {
        orderRefunded: {
          "{$request.body#/callbackUrl}": {
            post: {
              summary: "Refund issued",
              requestBody: { content: { "application/json": { schema: { type: "object" } } } },
              responses: {},
            },
            put: {
              summary: "Refund correction replay",
              requestBody: { content: { "application/json": { schema: { type: "object" } } } },
              responses: {},
            },
          },
        },
      },
    };

    render(withContext(<PathOperation method="post" path="/orders" op={twoMethods} id="post /orders" />));

    const cards = screen.getAllByRole("button", { expanded: false });
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent(/put.*orderRefunded.*\{request\.body\.callbackUrl\}/);
    expect(cards[1]).toHaveTextContent(/post.*orderRefunded.*\{request\.body\.callbackUrl\}/);

    // Opening one leaves the other closed.
    fireEvent.click(cards[1]);
    expect(cards[0]).toHaveAttribute("aria-expanded", "false");
    expect(cards[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("renders no Callbacks section for an operation without any", () => {
    const op: OpenAPIOperationData = { summary: "Plain", responses: {} };

    render(withContext(<PathOperation method="get" path="/x" op={op} id="get /x" />));

    expect(screen.queryByText("Callbacks")).not.toBeInTheDocument();
  });
});

describe("PathOperation response links", () => {
  // Mirrors the torture example's /users 201, which links the created user's
  // id into the getUser operation.
  const opWithLinks: OpenAPIOperationData = {
    summary: "Create a user",
    responses: {
      "201": {
        description: "User created",
        content: { "application/json": { schema: { type: "object" } } },
        links: {
          GetCreatedUser: {
            operationId: "getUser",
            description: "Fetch the newly created user",
            parameters: { userId: "$response.body#/id" },
          },
        },
      },
    },
  };

  it("reads as a sentence below the response, not as its own tab", () => {
    render(withContext(<PathOperation method="post" path="/users" op={opWithLinks} id="post /users" />));

    // A link is a relationship to another operation, not a view of this
    // response, so it sits inline rather than competing for a tab.
    expect(screen.queryByRole("tab", { name: "Links" })).not.toBeInTheDocument();

    // The description is its own node (the clickable part when navigable), so
    // assert on the sentence around it. The JSON Pointer expression reads as
    // a plain path in prose.
    const label = screen.getByText("Fetch the newly created user");
    expect(label.closest("p")).toHaveTextContent(
      "Fetch the newly created user using userId from response.body.id.",
    );
  });

  it("makes the description itself the clickable part and reports the target to the caller", () => {
    const onFollowOperation = vi.fn();
    render(
      withContext(
        <PathOperation
          method="post"
          path="/users"
          op={opWithLinks}
          id="post /users"
          onFollowOperation={onFollowOperation}
          isOperationKnown={(operationId) => operationId === "getUser"}
        />,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: "Fetch the newly created user" }));

    expect(onFollowOperation).toHaveBeenCalledWith("getUser");
  });

  it("renders an unresolvable target as plain text instead of a dead link", () => {
    render(
      withContext(
        <PathOperation
          method="post"
          path="/users"
          op={opWithLinks}
          id="post /users"
          onFollowOperation={vi.fn()}
          isOperationKnown={() => false}
        />,
      ),
    );

    expect(
      screen.queryByRole("button", { name: "Fetch the newly created user" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Fetch the newly created user")).toBeInTheDocument();
  });

  it("labels a link with no description by its target, which stays plain for an operationRef", () => {
    const op: OpenAPIOperationData = {
      responses: {
        "200": {
          description: "OK",
          links: { ByRef: { operationRef: "#/paths/~1users~1{id}/get" } },
        },
      },
    };

    render(
      withContext(
        <PathOperation
          method="get"
          path="/x"
          op={op}
          id="get /x"
          onFollowOperation={vi.fn()}
          isOperationKnown={() => true}
        />,
      ),
    );

    expect(screen.getByText("#/paths/~1users~1{id}/get")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /paths/ })).not.toBeInTheDocument();
  });
});

describe("PathOperation request/response tabs", () => {
  const opWithBoth: OpenAPIOperationData = {
    summary: "Create a pet",
    requestBody: { content: { "application/json": { schema: { type: "object" } } } },
    responses: {
      "201": { description: "Created", content: { "application/json": { schema: { type: "object" } } } },
    },
  };

  it("puts the two sides of the exchange on one strip, opening on Request", () => {
    render(withContext(<PathOperation method="post" path="/pets" op={opWithBoth} id="post /pets" />));

    expect(screen.getByRole("tab", { name: "request" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "response" })).toBeInTheDocument();
    // Content shows straight away: the tab is the disclosure, so there is no
    // second Show more inside it.
    expect(screen.getByText(/expects the following request body/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show more/ })).not.toBeInTheDocument();
  });

  it("swaps the shared panel when the other side is picked", () => {
    render(withContext(<PathOperation method="post" path="/pets" op={opWithBoth} id="post /pets" />));

    fireEvent.click(screen.getByRole("tab", { name: "response" }));

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.queryByText(/expects the following request body/)).not.toBeInTheDocument();
  });

  it("offers only Response for an operation with nothing to send", () => {
    const responseOnly: OpenAPIOperationData = {
      responses: { "200": { description: "A list of pets" } },
    };

    render(withContext(<PathOperation method="get" path="/pets" op={responseOnly} id="get /pets" />));

    expect(screen.queryByRole("tab", { name: "request" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "response" })).toBeInTheDocument();
    expect(screen.getByText("A list of pets")).toBeInTheDocument();
  });

  it("says so plainly for a status with neither a body nor headers", () => {
    const bare: OpenAPIOperationData = {
      responses: { "204": { description: "No content" } },
    };

    render(withContext(<PathOperation method="delete" path="/pets/{id}" op={bare} id="delete /pets/{id}" />));

    expect(screen.getByText("No response body.")).toBeInTheDocument();
  });
});

describe("PathOperation response headers", () => {
  // Mirrors the Petstore spec's /user/login 200, which declares both.
  const opWithHeaders: OpenAPIOperationData = {
    summary: "Logs user into the system",
    responses: {
      "200": {
        description: "successful operation",
        headers: {
          "X-Rate-Limit": {
            description: "calls per hour allowed by the user",
            schema: { type: "integer", format: "int32" },
          },
          "X-Expires-After": {
            description: "date in UTC when token expires",
            schema: { type: "string", format: "date-time" },
          },
        },
        content: { "application/json": { schema: { type: "string" } } },
      },
    },
  };

  it("offers a Headers tab beside Body and renders each header as a schema row", () => {
    render(withContext(<PathOperation method="get" path="/user/login" op={opWithHeaders} id="get /user/login" />));

    // No request half here, so the panel opens straight on Response.
    fireEvent.click(screen.getByRole("tab", { name: "Headers" }));

    // Opens straight on Schema (not the faked Example): a header's value is
    // generated at runtime, so the documented name/type/description is what
    // there is to show.
    expect(screen.getByText("X-Rate-Limit")).toBeInTheDocument();
    expect(screen.getByText("X-Expires-After")).toBeInTheDocument();
    expect(screen.getByText("calls per hour allowed by the user")).toBeInTheDocument();
  });

  it("renders headers directly, with no tab strip, when the response has no body", () => {
    const op: OpenAPIOperationData = {
      responses: {
        "204": {
          description: "No content",
          headers: { Location: { description: "Where the resource landed", schema: { type: "string" } } },
        },
      },
    };

    render(withContext(<PathOperation method="delete" path="/pets/{id}" op={op} id="delete /pets/{id}" />));

    // No Body/Headers strip at all: the lone half renders on its own.
    expect(screen.queryByRole("tab", { name: "Body" })).not.toBeInTheDocument();
    expect(screen.queryByText("No response body.")).not.toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
  });

  it("shows no tab strip for a body-only response", () => {
    const op: OpenAPIOperationData = {
      responses: {
        "200": {
          description: "A list of pets",
          content: { "application/json": { schema: { type: "array", items: {} } } },
        },
      },
    };

    render(withContext(<PathOperation method="get" path="/pets" op={op} id="get /pets" />));

    expect(screen.queryByRole("tab", { name: "Headers" })).not.toBeInTheDocument();
  });
});
