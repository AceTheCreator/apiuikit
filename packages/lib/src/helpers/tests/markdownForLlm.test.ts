import { describe, expect, it } from "vitest";
import { markdownForLlm } from "../markdownForLlm";

describe("markdownForLlm", () => {
  it("prepends a fixed agent instructions block", () => {
    const result = markdownForLlm("# Petstore API\n\nSome content.");
    expect(result).toBe(
      [
        "> ## Agent Instructions",
        "> The following is API documentation in Markdown.",
        "> Use it to answer questions about this API and help write client code.",
        "> Stick to what is documented below - do not invent endpoints, fields, or behavior.",
        "",
        "# Petstore API",
        "",
        "Some content.",
      ].join("\n"),
    );
  });
});
