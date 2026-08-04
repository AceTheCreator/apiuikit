import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { OpenAPIDocumentData } from "../../types/openapi";
import { AsyncAPIProvider, Operations, Servers, Messages, Info } from "../sections";
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
  it("renders <Operations document={...}> on its own, without an ambient provider", () => {
    render(<Operations document={asDoc(doc)} />);
    // The operations table renders its channel address, proof it mounted with
    // a working document context (no useAsyncAPIDocument throw, $ref resolved).
    expect(document.body.textContent).toContain("smartylighting/measured");
    expect(document.body.textContent).not.toContain("$ref");
  });

  it("renders <Info document={...}> on its own", () => {
    render(<Info document={asDoc(doc)} />);
    expect(screen.getByText("Streetlights")).toBeInTheDocument();
  });

  it("composes several sections under one <AsyncAPIProvider> (no per-section document)", () => {
    render(
      <AsyncAPIProvider document={asDoc(doc)}>
        <Servers />
        <Operations />
        <Messages />
      </AsyncAPIProvider>,
    );
    const text = document.body.textContent ?? "";
    expect(text).toContain("broker.example.com"); // Servers
    expect(text).toContain("smartylighting/measured"); // Operations
    expect(text).toContain("Light measured"); // Messages
  });

  it("throws a helpful error when used with neither a document prop nor a provider", () => {
    // Silence the expected React error boundary logging for this case.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Operations />)).toThrow(/needs a `document` prop/);
    spy.mockRestore();
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
