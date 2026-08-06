import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AsyncAPI from "../../AsyncAPI/AsyncAPI";
import type { AsyncAPIDocumentData } from "../../../types/schema";

// A server offering two ways to authenticate, both `httpApiKey`, declared as
// $refs into components.securitySchemes — the shape that used to render a
// single un-tabbed scheme, hiding the second entirely.
const doc = {
  asyncapi: "3.0.0",
  info: { title: "Notification Service", version: "1.0.0" },
  servers: {
    production: {
      host: "api.example.com",
      pathname: "/notifications",
      protocol: "wss",
      security: [
        { $ref: "#/components/securitySchemes/bearerAuth" },
        { $ref: "#/components/securitySchemes/apiKeyAuth" },
      ],
    },
  },
  channels: { notifications: { address: "notifications" } },
  operations: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "httpApiKey",
        name: "Authorization",
        in: "header",
        description: "A JWT supplied through the Authorization header.",
      },
      apiKeyAuth: {
        type: "httpApiKey",
        name: "X-API-Key",
        in: "header",
        description: "An API key supplied through the X-API-Key header.",
      },
    },
  },
} as unknown as AsyncAPIDocumentData;

describe("server security", () => {
  it("renders a tab for every scheme the server declares, through $refs", () => {
    render(<AsyncAPI asyncapi={doc} />);

    const section = within(document.getElementById("server-production-security")!);
    expect(section.getAllByRole("tab")).toHaveLength(2);
  });

  it("shows each scheme's own description when its tab is selected", () => {
    render(<AsyncAPI asyncapi={doc} />);

    const section = within(document.getElementById("server-production-security")!);
    fireEvent.click(section.getByRole("tab", { name: /X-API-Key/ }));
    expect(screen.getByText(/An API key supplied through the X-API-Key header/)).toBeInTheDocument();

    fireEvent.click(section.getByRole("tab", { name: /Authorization/ }));
    expect(screen.getByText(/A JWT supplied through the Authorization header/)).toBeInTheDocument();
  });
});
