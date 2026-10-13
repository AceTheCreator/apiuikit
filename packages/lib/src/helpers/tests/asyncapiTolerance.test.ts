import { describe, expect, it } from "vitest";
import { parseDocument } from "../parser";
import example from "../../config/examples/example1.json";
import protobuf from "../../config/examples/protobuf-streetlight.json";
import avro from "../../config/examples/avro-streetlight.json";

describe("AsyncAPI tolerant parsing", () => {
  it.each([example, avro, protobuf])("preserves transformations with missing metadata", async (source) => {
    const valid = await parseDocument(JSON.stringify(source));
    const { version: _version, ...info } = source.info;
    const partial = await parseDocument(JSON.stringify({ ...source, info }));
    expect(partial.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 0 })]));
    expect(valid.document).not.toBeNull();
    expect(partial.document).not.toBeNull();
    expect(partial.document?.operations).toEqual(valid.document?.operations);
    expect(partial.document?.components).toEqual(valid.document?.components);
  });

  it.each(["{", "asyncapi: [", "null", "[]", "hello", '{"asyncapi":"99.0.0"}'])("rejects unusable input %s", async (raw) => {
    const result = await parseDocument(raw);
    expect(result.document).toBeNull();
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it("reports a broken channel reference without throwing", async () => {
    const result = await parseDocument(JSON.stringify({ ...example, operations: {
      broken: { action: "receive", channel: { $ref: "#/channels/absent" } },
    } }));
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 0 })]));
  });
  it("still applies operation traits and resolves channel references with validation errors", async () => {
    const result = await parseDocument(JSON.stringify({
      asyncapi: "3.0.0", info: { title: "Traits" },
      channels: { events: { address: "events" } },
      operations: { consume: {
        action: "receive", channel: { $ref: "#/channels/events" },
        traits: [{ $ref: "#/components/operationTraits/common" }],
      } },
      components: { operationTraits: { common: { summary: "Inherited summary" } } },
    }));
    expect(result.document?.operations?.consume).toMatchObject({
      summary: "Inherited summary", channel: { address: "events" },
    });
    expect(result.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ severity: 0 })]));
  });

});
