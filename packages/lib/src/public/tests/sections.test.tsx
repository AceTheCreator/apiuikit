import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { OpenAPIDocumentData } from "../../types/openapi";
import { AsyncAPIProvider, AsyncAPIOperations, AsyncAPIServers, AsyncAPIMessages, AsyncAPIInfo } from "../sections";
import { OpenAPIEndpoints, OpenAPIProvider, OpenAPIWebhooks } from "../openapiSections";

const asDoc = (doc: unknown) => doc as AsyncAPIDocumentData;

const doc = {
  asyncapi: "3.0.0",
  info: { title: "Streetlights", version: "1.0.0" },
  servers: {
    production: { host: "broker.example.com", protocol: "kafka" },
  },
  channels: {
    lightingChannel: { address: "smartylighting/measured", messages: {} },
  },
  operations: {
    receiveMeasurement: {
      action: "receive",
      channel: { $ref: "#/channels/lightingChannel" },
      summary: "Receive a lighting measurement",
    },
  },
  components: {
    messages: {
      lightMeasured: { title: "Light measured", payload: { type: "object" } },
    },
  },
};

describe("standalone section components", () => {
  it("renders <AsyncAPIOperations document={...}> on its own, without an ambient provider", () => {
    render(<AsyncAPIOperations document={asDoc(doc)} />);
    // The operations table renders its channel address, proof it mounted with
    // a working document context (no useAsyncAPIDocument throw, $ref resolved).
    expect(document.body.textContent).toContain("smartylighting/measured");
    expect(document.body.textContent).not.toContain("$ref");
  });

  it("renders <AsyncAPIInfo document={...}> on its own", () => {
    render(<AsyncAPIInfo document={asDoc(doc)} />);
    expect(screen.getByText("Streetlights")).toBeInTheDocument();
  });

  it("composes several sections under one <AsyncAPIProvider> (no per-section document)", () => {
    render(
      <AsyncAPIProvider document={asDoc(doc)}>
        <AsyncAPIServers />
        <AsyncAPIOperations />
        <AsyncAPIMessages />
      </AsyncAPIProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("broker.example.com"); // AsyncAPIServers
    expect(text).toContain("smartylighting/measured"); // AsyncAPIOperations
    expect(text).toContain("Light measured"); // AsyncAPIMessages
  });

  it("throws a helpful error when used with neither a document prop nor a provider", () => {
    // Silence the expected React error boundary logging for this case.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<AsyncAPIOperations />)).toThrow(/needs a `document` prop/);
    spy.mockRestore();
  });

  it("drops the reserved side column when layout=\"stacked\"", () => {
    const { rerender } = render(<AsyncAPIOperations document={asDoc(doc)} />);
    expect(screen.getByTestId("section-side-column")).toBeInTheDocument();

    rerender(<AsyncAPIOperations document={asDoc(doc)} layout="stacked" />);
    expect(screen.queryByTestId("section-side-column")).not.toBeInTheDocument();
    expect(document.body.textContent).toContain("smartylighting/measured");
  });

  it("stacks Info side content when layout=\"stacked\"", () => {
    const withLicense = {
      ...doc,
      info: {
        ...doc.info,
        license: { name: "Apache 2.0", url: "https://www.apache.org/licenses/LICENSE-2.0" },
      },
    };
    render(<AsyncAPIInfo document={asDoc(withLicense)} layout="stacked" />);
    expect(screen.queryByTestId("section-side-column")).not.toBeInTheDocument();
    expect(screen.getByText("Streetlights")).toBeInTheDocument();
    expect(screen.getByText(/Apache 2.0/)).toBeInTheDocument();
  });
});

describe("standalone OpenAPI webhooks section", () => {
  const webhookDoc = {
    openapi: "3.1.0",
    info: { title: "Petstore", version: "1.0.0" },
    webhooks: {
      newPet: { post: { summary: "New pet added", responses: { "200": { description: "OK" } } } },
    },
  } as unknown as OpenAPIDocumentData;

  it("renders on its own from a document prop", () => {
    render(<OpenAPIWebhooks document={webhookDoc} />);

    expect(screen.getByText("Webhook")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "POST newPet" })).toBeInTheDocument();
  });

  it("composes under OpenAPIProvider without its own document prop", () => {
    render(
      <OpenAPIProvider document={webhookDoc}>
        <OpenAPIWebhooks />
      </OpenAPIProvider>,
    );

    expect(screen.getByRole("button", { name: "POST newPet" })).toBeInTheDocument();
  });

  it("renders nothing for a document that declares no webhooks", () => {
    const { container } = render(
      <OpenAPIWebhooks
        document={{ openapi: "3.0.0", info: { title: "X", version: "1" } } as unknown as OpenAPIDocumentData}
      />,
    );

    expect(container.textContent).toBe("");
  });
});

describe("mismatched providers", () => {
  afterEach(() => vi.restoreAllMocks());

  const openapiDoc = {
    openapi: "3.0.0",
    info: { title: "Petstore", version: "1.0.0" },
    paths: {
      "/pets": { get: { summary: "List pets", responses: { "200": { description: "OK" } } } },
    },
  } as unknown as OpenAPIDocumentData;

  it("warns when an OpenAPI section is composed under an AsyncAPI provider, and doesn't crash", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <AsyncAPIProvider document={asDoc(doc)}>
        <OpenAPIEndpoints />
      </AsyncAPIProvider>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/OpenAPI section.*asyncapi document provider/));
  });

  it("falls back to the section's own document prop under a mismatched provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <AsyncAPIProvider document={asDoc(doc)}>
        <OpenAPIEndpoints document={openapiDoc} />
      </AsyncAPIProvider>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/own `document` prop instead/));
    expect(document.body.textContent).toContain("/pets");
  });
});
