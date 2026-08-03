import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Bindings from "../Bindings";

describe("Bindings", () => {
  it("renders a JSON-Schema-like {type, description} property as just its description, not Type/Description rows", () => {
    render(
      <Bindings
        protocol="kafka"
        expand
        bindings={{
          "x-group-id": {
            type: "string",
            description: "The groupId must be prefixed by your `svc` account.",
          },
        }}
      />,
    );

    expect(screen.getByText(/The groupId must be prefixed/i)).toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();
    expect(screen.queryByText("string")).not.toBeInTheDocument();
    expect(screen.queryByText("Description")).not.toBeInTheDocument();
  });

  it("still renders enum values as chips", () => {
    render(
      <Bindings
        protocol="kafka"
        expand
        bindings={{
          cleanupPolicy: { type: "string", enum: ["delete", "compact"] },
        }}
      />,
    );

    expect(screen.getByText("delete")).toBeInTheDocument();
    expect(screen.getByText("compact")).toBeInTheDocument();
  });

  it("still recurses into nested objects that aren't a plain {type, description} pair", () => {
    render(
      <Bindings
        protocol="kafka"
        expand
        bindings={{
          retention: { type: "string", description: "How long to keep it.", default: "7d" },
        }}
      />,
    );

    // Falls through to the generic per-key renderer since there's a third key.
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });
});
