import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { OpenAPIDocumentData } from "../../types/openapi";
import { AsyncAPIMessage, AsyncAPIOperation, AsyncAPIProvider } from "../sections";
import { OpenAPIEndpoint, OpenAPIProvider, OpenAPIWebhook } from "../openapiSections";
import { Schema } from "../schemasSection";

const asyncDoc = {
  asyncapi: "3.0.0",
  info: { title: "Streetlights", version: "1.0.0" },
  channels: {
    lightingChannel: { address: "smartylighting/measured", messages: {} },
    dimChannel: { address: "smartylighting/dim", messages: {} },
  },
  operations: {
    receiveMeasurement: {
      action: "receive",
      channel: { $ref: "#/channels/lightingChannel" },
      summary: "Receive a lighting measurement",
    },
    dimLight: {
      action: "send",
      channel: { $ref: "#/channels/dimChannel" },
    },
  },
  components: {
    messages: {
      lightMeasured: { title: "Light measured", summary: "Lumens were measured", payload: { type: "object" } },
      dimLightCommand: { title: "Dim light command", payload: { type: "object" } },
    },
    schemas: {
      Lumens: { type: "integer", description: "Light intensity" },
    },
  },
} as unknown as AsyncAPIDocumentData;

const openDoc = {
  openapi: "3.1.0",
  info: { title: "Petstore", version: "1.0.0" },
  paths: {
    "/pets": {
      get: { operationId: "listPets", summary: "List pets", responses: { "200": { description: "OK" } } },
      post: { operationId: "addPet", summary: "Add a pet", responses: { "201": { description: "Created" } } },
    },
    "/pets/{petId}": {
      get: { summary: "Get one pet", responses: { "200": { description: "OK" } } },
    },
  },
  webhooks: {
    newPet: { post: { summary: "New pet added", responses: { "200": { description: "OK" } } } },
  },
  components: {
    schemas: {
      Pet: { type: "object", description: "A pet", properties: { name: { type: "string" } } },
      Owner: { type: "object", description: "A pet owner", properties: { email: { type: "string" } } },
    },
  },
} as unknown as OpenAPIDocumentData;

const text = () => document.body.textContent ?? "";

// A standalone section always mounts its provider's (empty) theme root, so
// "renders nothing" means nothing inside it.
const expectNothingRendered = () => {
  expect(document.querySelector("article")).toBeNull();
  expect(text()).toBe("");
};

afterEach(() => vi.restoreAllMocks());

describe("OpenAPIEndpoint", () => {
  it("renders one endpoint inline by operationId, and no other", () => {
    render(<OpenAPIEndpoint document={openDoc} operationId="addPet" />);
    expect(screen.getByText("post")).toBeInTheDocument();
    expect(text()).toContain("/pets");
    expect(text()).not.toContain("List pets");
    // Inline, not a list: no table rows to click.
    expect(document.querySelector("table")).toBeNull();
  });

  it("renders one endpoint by method + path", () => {
    render(<OpenAPIEndpoint document={openDoc} method="get" path="/pets/{petId}" />);
    expect(screen.getByText("get")).toBeInTheDocument();
    expect(text()).toContain("petId");
  });

  it("composes under OpenAPIProvider without its own document prop", () => {
    render(
      <OpenAPIProvider document={openDoc}>
        <OpenAPIEndpoint operationId="listPets" />
        <OpenAPIEndpoint operationId="addPet" />
      </OpenAPIProvider>,
    );
    expect(screen.getByText("get")).toBeInTheDocument();
    expect(screen.getByText("post")).toBeInTheDocument();
  });

  it("renders nothing and warns when no endpoint matches", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<OpenAPIEndpoint document={openDoc} operationId="missing" />);
    expectNothingRendered();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('operationId "missing"'));
  });

  it("defaults to the stacked layout, and honours an explicit columns layout", () => {
    const { rerender } = render(<OpenAPIEndpoint document={openDoc} operationId="addPet" />);
    expect(screen.queryByTestId("section-side-column")).not.toBeInTheDocument();
    rerender(<OpenAPIEndpoint document={openDoc} operationId="addPet" layout="columns" />);
    expect(screen.getByTestId("section-side-column")).toBeInTheDocument();
  });
});

describe("OpenAPIWebhook", () => {
  it("renders one webhook, picking its only method when none is given", () => {
    render(<OpenAPIWebhook document={openDoc} name="newPet" />);
    expect(screen.getByText("post")).toBeInTheDocument();
    expect(text()).toContain("newPet");
  });

  it("renders nothing and warns for an unknown webhook or method", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = render(<OpenAPIWebhook document={openDoc} name="nope" />);
    expectNothingRendered();
    rerender(<OpenAPIWebhook document={openDoc} name="newPet" method="get" />);
    expectNothingRendered();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe("AsyncAPIOperation", () => {
  it("renders one operation inline, and no other", () => {
    render(<AsyncAPIOperation document={asyncDoc} operationId="receiveMeasurement" />);
    expect(text()).toContain("smartylighting/measured");
    expect(text()).not.toContain("smartylighting/dim");
    expect(document.querySelector("table")).toBeNull();
  });

  it("composes under AsyncAPIProvider", () => {
    render(
      <AsyncAPIProvider document={asyncDoc}>
        <AsyncAPIOperation operationId="dimLight" />
      </AsyncAPIProvider>,
    );
    expect(text()).toContain("smartylighting/dim");
  });

  it("renders nothing and warns when the operation doesn't exist", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<AsyncAPIOperation document={asyncDoc} operationId="missing" />);
    expectNothingRendered();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
  });
});

describe("AsyncAPIMessage", () => {
  it("renders one message with its details open", () => {
    render(<AsyncAPIMessage document={asyncDoc} messageId="lightMeasured" />);
    expect(screen.getByText("Light measured")).toBeInTheDocument();
    expect(screen.getByText("Lumens were measured")).toBeInTheDocument();
    expect(screen.getByText("Show less")).toBeInTheDocument();
    expect(text()).not.toContain("Dim light command");
  });

  it("renders nothing and warns when the message doesn't exist", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<AsyncAPIMessage document={asyncDoc} messageId="missing" />);
    expectNothingRendered();
    expect(warn).toHaveBeenCalled();
  });
});

describe("Schema", () => {
  it("renders one schema from an OpenAPI document, and no other", () => {
    render(<Schema document={openDoc} name="Pet" />);
    expect(screen.getByText("A pet")).toBeInTheDocument();
    expect(text()).not.toContain("A pet owner");
  });

  it("renders one schema from an AsyncAPI document under its provider", () => {
    render(
      <AsyncAPIProvider document={asyncDoc}>
        <Schema name="Lumens" />
      </AsyncAPIProvider>,
    );
    expect(screen.getByText("Light intensity")).toBeInTheDocument();
  });

  it("doesn't reuse the Schemas list's anchor id, so both can share a page", () => {
    render(<Schema document={openDoc} name="Pet" />);
    expect(document.getElementById("schema-Pet")).toBeNull();
  });

  it("renders nothing and warns when the schema doesn't exist", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<Schema document={openDoc} name="Missing" />);
    expectNothingRendered();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"Missing"'));
  });

  it("throws a helpful error with neither a document nor a provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Schema name="Pet" />)).toThrow(/The Schema section needs a `document` prop/);
  });
});
