import { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SchemaTabs from "../SchemaTab";
import { AsyncAPIDocumentContext } from "../../../contexts";
import { DEFAULT_DEPTH_COLORS } from "../depthColors";
import type { AsyncAPIDocumentData } from "../../../types/schema";

/** SchemaTree (the Schema tab body) reads deref/expand state from the document context. */
function Providers({ children }: { children: ReactNode }) {
  return (
    <AsyncAPIDocumentContext.Provider
      value={{
        specType: "asyncapi",
        document: {} as AsyncAPIDocumentData,
        deref: () => undefined,
        portalHost: null,
        rootElement: null,
        defaultSchemaExpanded: true,
        depthColors: DEFAULT_DEPTH_COLORS,
        showExtensions: true,
      }}
    >
      {children}
    </AsyncAPIDocumentContext.Provider>
  );
}

const renderTabs = (props: Parameters<typeof SchemaTabs>[0]) =>
  render(<SchemaTabs {...props} />, { wrapper: Providers });

const jsonSchema = {
  type: "object",
  properties: { name: { type: "string" } },
  required: ["name"],
};

const rawAvro = {
  type: "record",
  name: "User",
  fields: [{ name: "name", type: "string" }],
};

describe("SchemaTabs", () => {
  it("renders the label, description, and example tab by default", () => {
    renderTabs({
      schema: jsonSchema,
      label: "Payload",
      description: "A user payload",
    });

    expect(screen.getByText("Payload")).toBeInTheDocument();
    expect(screen.getByText("A user payload")).toBeInTheDocument();

    // Example tab is preselected when examples are supported.
    expect(screen.getByRole("tab", { name: "Example" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Switching to Schema shows the tree, not raw JSON.
    fireEvent.click(screen.getByRole("tab", { name: "Schema" }));
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(document.querySelector("pre")).not.toBeInTheDocument();
  });

  it('opens on the schema tree when defaultView is "schema", keeping Example available', () => {
    // For groups whose values are generated at runtime (request parameters,
    // response headers) a faked example is noise; the documented shape isn't.
    renderTabs({ schema: jsonSchema, label: "Headers", defaultView: "schema" });

    expect(screen.getByRole("tab", { name: "Schema" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Example" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("colors the first visible schema row with the first depth color, not the second", () => {
    // SchemaTab always renders the tree with `rootName` set, which suppresses the
    // root row — its children (like "name" here) are the first thing a user sees,
    // and must start at depth 0, not depth 1.
    renderTabs({ schema: jsonSchema, label: "Payload" });
    fireEvent.click(screen.getByRole("tab", { name: "Schema" }));

    expect(screen.getByText("name")).toHaveStyle({
      color: DEFAULT_DEPTH_COLORS[0],
    });
  });

  it("offers Example, Schema, and JSON tabs for plain JSON Schema", () => {
    renderTabs({ schema: jsonSchema, label: "Payload" });

    expect(
      screen.getAllByRole("tab").map((tab) => tab.textContent),
    ).toEqual(["Example", "Schema", "JSON"]);
  });

  it("shows the raw source on the JSON tab when an originalSchema exists", () => {
    renderTabs({
      schema: jsonSchema,
      label: "Payload",
      schemaFormat: "application/vnd.apache.avro;version=1.9.0",
      originalSchema: rawAvro,
    });

    fireEvent.click(screen.getByRole("tab", { name: "JSON" }));

    // The JSON tab must show the pre-conversion Avro definition, not the
    // converted JSON Schema.
    const pre = document.querySelector("pre");
    expect(pre?.textContent).toContain('"record"');
    expect(pre?.textContent).not.toContain('"properties"');
  });

  it("falls back to the converted schema on the JSON tab without an original", () => {
    renderTabs({ schema: jsonSchema, label: "Payload" });

    fireEvent.click(screen.getByRole("tab", { name: "JSON" }));

    expect(document.querySelector("pre")?.textContent).toContain('"properties"');
  });

  it("shows a format badge for Avro (with version) but none for default formats", () => {
    const { unmount } = renderTabs({
      schema: jsonSchema,
      label: "Payload",
      schemaFormat: "application/vnd.apache.avro;version=1.9.0",
    });

    const badge = screen.getByText("avro 1.9.0");
    expect(badge).toHaveAttribute(
      "title",
      "application/vnd.apache.avro;version=1.9.0",
    );
    unmount();

    renderTabs({
      schema: jsonSchema,
      label: "Payload",
      schemaFormat: "application/vnd.aai.asyncapi;version=3.0.0",
    });
    expect(screen.queryByText(/avro/)).not.toBeInTheDocument();
    expect(screen.queryByText(/application\/vnd\.aai/)).not.toBeInTheDocument();
  });

  it("hides the Example tab and shows a warning banner on conversion errors", () => {
    renderTabs({
      schema: rawAvro,
      label: "Payload",
      schemaFormat: "application/vnd.apache.avro;version=1.9.0",
      originalSchema: rawAvro,
      conversionError: "unknown type: banana",
    });

    expect(
      screen.getByText(/Could not convert Avro schema/),
    ).toBeInTheDocument();
    expect(screen.getByText(/unknown type: banana/)).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Example" }),
    ).not.toBeInTheDocument();
  });

  it("offers the Example tab and a short badge for protobuf", () => {
    renderTabs({
      schema: jsonSchema,
      label: "Payload",
      schemaFormat: "application/vnd.google.protobuf;version=3",
      originalSchema: 'syntax = "proto3"; message User { string name = 1; }',
    });

    expect(screen.getByRole("tab", { name: "Example" })).toBeInTheDocument();
    const badge = screen.getByText("protobuf 3");
    expect(badge).toHaveAttribute(
      "title",
      "application/vnd.google.protobuf;version=3",
    );
  });

  it("shows raw .proto source unescaped on the JSON tab", () => {
    const proto = 'syntax = "proto3";\nmessage User { string name = 1; }';
    renderTabs({
      schema: jsonSchema,
      label: "Payload",
      schemaFormat: "application/vnd.google.protobuf;version=3",
      originalSchema: proto,
    });

    fireEvent.click(screen.getByRole("tab", { name: "JSON" }));

    // The string body renders as-is, not JSON.stringify'd onto one line.
    expect(document.querySelector("pre")?.textContent).toBe(proto);
  });

  it("names Protobuf in the conversion-error banner", () => {
    renderTabs({
      schema: {},
      label: "Payload",
      schemaFormat: "application/vnd.google.protobuf;version=3",
      originalSchema: "message Broken {",
      conversionError: "illegal token",
    });

    expect(
      screen.getByText(/Could not convert Protobuf schema/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: "Example" }),
    ).not.toBeInTheDocument();
  });

  it("hides the Example tab for unconverted formats like RAML", () => {
    renderTabs({
      schema: {},
      label: "Payload",
      schemaFormat: "application/raml+yaml;version=1.0",
    });

    expect(
      screen.queryByRole("tab", { name: "Example" }),
    ).not.toBeInTheDocument();
    // Unknown formats surface verbatim as the badge.
    expect(
      screen.getByText("application/raml+yaml;version=1.0"),
    ).toBeInTheDocument();
  });

  it("generates an example on the Example tab", async () => {
    renderTabs({ schema: jsonSchema, label: "Payload" });

    fireEvent.click(screen.getByRole("tab", { name: "Example" }));

    // json-schema-faker output is seeded, so `name` is always present.
    const pre = await screen.findByText(/"name"/);
    expect(pre).toBeInTheDocument();
  });

  it("falls back to the Schema tab when the Example tab disappears", async () => {
    const { rerender } = renderTabs({ schema: jsonSchema, label: "Payload" });

    fireEvent.click(screen.getByRole("tab", { name: "Example" }));
    await screen.findByText(/"name"/);
    expect(screen.getByRole("tab", { name: "Example" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // The document is edited into a broken Avro schema: conversion now fails,
    // the Example tab vanishes, and the panel must not go blank.
    rerender(
      <SchemaTabs
        schema={rawAvro}
        label="Payload"
        schemaFormat="application/vnd.apache.avro;version=1.9.0"
        originalSchema={rawAvro}
        conversionError="boom"
      />,
    );

    expect(screen.getByRole("tab", { name: "Schema" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Could not convert Avro schema/)).toBeInTheDocument();
  });

  it("renders a circular row instead of recursing forever on identity cycles", () => {
    // Pre-resolved documents (@asyncapi/parser output) inline refs as plain
    // object references — a recursive schema literally contains itself, with
    // no $ref string left for the tree's ref-based cycle detection to key on.
    const user: Record<string, unknown> = {
      type: "object",
      "x-parser-schema-id": "user",
      properties: { name: { type: "string" } },
    };
    (user.properties as Record<string, unknown>).self = user;

    // Providers sets defaultSchemaExpanded: true — before the identity guard,
    // this render would overflow the stack instead of terminating.
    renderTabs({ schema: user, label: "Payload" });
    fireEvent.click(screen.getByRole("tab", { name: "Schema" }));

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("↩ user")).toBeInTheDocument();
  });
});
