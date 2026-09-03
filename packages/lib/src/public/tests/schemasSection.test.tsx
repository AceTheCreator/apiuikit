import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AsyncAPIDocumentData } from "../../types/schema";
import type { OpenAPIDocumentData } from "../../types/openapi";
import { definePlugin } from "../../plugins/types";
import * as AsyncAPIDocumentProviderModule from "../../containers/AsyncAPI/AsyncAPIDocumentProvider";
import * as OpenAPIDocumentProviderModule from "../../containers/OpenAPI/OpenAPIDocumentProvider";
import { Schemas } from "../schemasSection";

describe("Schemas section provider selection", () => {
  it("wraps Swagger 2.0 documents in OpenAPIDocumentProvider", () => {
    const swaggerDoc = {
      swagger: "2.0",
      info: { title: "Legacy API", version: "1.0.0" },
      components: {
        schemas: {
          Pet: { type: "object", properties: { name: { type: "string" } } },
        },
      },
    } as unknown as OpenAPIDocumentData;

    const { container } = render(<Schemas document={swaggerDoc} />);

    expect(container.querySelector(".openapi-portal-root")).toBeInTheDocument();
    expect(container.querySelector(".asyncapi-portal-root")).not.toBeInTheDocument();
  });

  it("wraps OpenAPI 3.x documents in OpenAPIDocumentProvider", () => {
    const openapiDoc = {
      openapi: "3.0.0",
      info: { title: "Petstore", version: "1.0.0" },
      components: {
        schemas: {
          Pet: { type: "object", properties: { name: { type: "string" } } },
        },
      },
    } as unknown as OpenAPIDocumentData;

    const { container } = render(<Schemas document={openapiDoc} />);

    expect(container.querySelector(".openapi-portal-root")).toBeInTheDocument();
    expect(container.querySelector(".asyncapi-portal-root")).not.toBeInTheDocument();
  });

  it("wraps AsyncAPI documents in AsyncAPIDocumentProvider", () => {
    const asyncapiDoc = {
      asyncapi: "3.0.0",
      info: { title: "Events", version: "1.0.0" },
      components: {
        schemas: {
          Event: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    } as unknown as AsyncAPIDocumentData;

    const { container } = render(<Schemas document={asyncapiDoc} />);

    expect(container.querySelector(".asyncapi-portal-root")).toBeInTheDocument();
    expect(container.querySelector(".openapi-portal-root")).not.toBeInTheDocument();
  });

  it("passes plugins to AsyncAPIDocumentProvider in standalone mode", () => {
    const spy = vi.spyOn(AsyncAPIDocumentProviderModule, "AsyncAPIDocumentProvider");
    const plugin = definePlugin({ name: "schemas-plugin", slots: {} });
    const asyncapiDoc = {
      asyncapi: "3.0.0",
      info: { title: "Events", version: "1.0.0" },
      components: { schemas: {} },
    } as unknown as AsyncAPIDocumentData;

    render(<Schemas document={asyncapiDoc} plugins={[plugin]} />);

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ plugins: [plugin] });
    spy.mockRestore();
  });

  it("passes plugins to OpenAPIDocumentProvider in standalone mode", () => {
    const spy = vi.spyOn(OpenAPIDocumentProviderModule, "OpenAPIDocumentProvider");
    const plugin = definePlugin({ name: "schemas-plugin", slots: {} });
    const openapiDoc = {
      openapi: "3.0.0",
      info: { title: "Petstore", version: "1.0.0" },
      components: { schemas: {} },
    } as unknown as OpenAPIDocumentData;

    render(<Schemas document={openapiDoc} plugins={[plugin]} />);

    expect(spy.mock.calls[0]?.[0]).toMatchObject({ plugins: [plugin] });
    spy.mockRestore();
  });

  it("renders with no schemas when the document has no components block", () => {
    const asyncapiDoc = {
      asyncapi: "3.0.0",
      info: { title: "Events", version: "1.0.0" },
    } as unknown as AsyncAPIDocumentData;

    const { getByText } = render(<Schemas document={asyncapiDoc} />);

    expect(getByText("No schemas defined in this document.")).toBeInTheDocument();
  });
});
