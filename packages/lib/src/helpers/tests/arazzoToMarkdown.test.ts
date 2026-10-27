import { describe, expect, it } from "vitest";
import { arazzoToMarkdown, arazzoWorkflowToMarkdown } from "../arazzoToMarkdown";
import { documentToLlmsTxt, documentToMarkdown, listDocumentTargets } from "../llmsTxt";
import { parseArazzoDocument, resolveArazzoDocument } from "../arazzoModel";
import { bnpl, petCoupons } from "./fixtures/arazzo";
import { actionFlows, adoptionFlows, petstoreSource, unresolvedSourceFlows } from "../../stories/arazzoExamples";

const resolve = async (document: Record<string, unknown>, sources: Record<string, unknown> = { petstore: petstoreSource }) =>
  (await resolveArazzoDocument(document, { sources: sources as Record<string, Record<string, unknown>> })).model!;

describe("arazzoToMarkdown", () => {
  it("describes the official pet coupons example", async () => {
    const { model } = await parseArazzoDocument(petCoupons.arazzo, { sources: petCoupons.sources });
    expect(arazzoToMarkdown(model!)).toMatchSnapshot();
  });

  it("describes the official buy now, pay later example", async () => {
    const { model } = await parseArazzoDocument(bnpl.arazzo, { sources: bnpl.sources });
    expect(arazzoToMarkdown(model!)).toMatchSnapshot();
  });

  it("says what each step calls, sends, checks and outputs", async () => {
    const markdown = arazzoToMarkdown(await resolve(adoptionFlows));

    expect(markdown).toContain("# Pet adoption");
    expect(markdown).toContain("- `petstore` (OpenAPI): `./openapi-petstore.json`");
    expect(markdown).toContain("## Add a pet and read it back");
    expect(markdown).toContain("### Step 1: `create`");
    expect(markdown).toContain("**Calls:** `POST /pets` (operation `createPet` in source `petstore`)");
    expect(markdown).toContain("| `petId` | path | `$steps.create.outputs.petId` |");
    expect(markdown).toContain("- `$statusCode == 201`");
    expect(markdown).toContain("- `$response.body` matches jsonpath `$[?(@.name)]`");
    expect(markdown).toContain("- `petId`: `$response.body#/id`");
    expect(markdown).toContain("**Runs workflow:** `add-pet`: Add a pet and read it back");
    expect(markdown).toContain("**Runs after:** `add-pet`");
  });

  it("describes every action type", async () => {
    const markdown = arazzoToMarkdown(await resolve(actionFlows));

    expect(markdown).toContain("- `next-page`: go to step `page` when `$response.header.x-next != null`");
    expect(markdown).toContain("- `inspect-first`: go to workflow `inspect` when `$response.body` matches jsonpath `$[0]`");
    expect(markdown).toContain("- `rate-limited`: retry after 2s, up to 5 times when `$statusCode == 429`");
    expect(markdown).toContain("- `give-up`: end the workflow when `$statusCode >= 500`");
    expect(markdown).toContain("**On failure (every step):**");
  });

  it("describes steps whose source is unavailable by their reference as written", async () => {
    const markdown = arazzoToMarkdown(await resolve(unresolvedSourceFlows));

    expect(markdown).toMatch(/- `payments` \(OpenAPI\): `\.\/payments\.yaml`\. Unavailable: /);
    expect(markdown).toMatch(/\*\*Calls:\*\* operationId `\$sourceDescriptions\.payments\.createCharge` \(unavailable: /);
    expect(markdown).toMatch(/\*\*Calls:\*\* operationPath `\{\$sourceDescriptions\.payments\.url\}#\/paths\/~1charges~1\{id\}\/get` \(unavailable: /);
    // The step whose source did load still says what it calls.
    expect(markdown).toContain("**Calls:** `GET /pets/{petId}`");
  });

  it("prints a recursive inputs schema without looping", async () => {
    const model = await resolve({
      ...adoptionFlows,
      workflows: [{ ...adoptionFlows.workflows[0], inputs: { $ref: "#/components/inputs/node" } }],
      components: {
        inputs: { node: { type: "object", properties: { child: { $ref: "#/components/inputs/node" } } } },
      },
    });
    const markdown = arazzoToMarkdown(model);
    expect(markdown).toContain('"child"');
    expect(markdown).not.toContain("x-parser-");
  });

  it("gives the same output for the same model", async () => {
    const model = await resolve(adoptionFlows);
    expect(arazzoToMarkdown(model)).toBe(arazzoToMarkdown(model));
  });
});

describe("arazzoWorkflowToMarkdown", () => {
  it("renders one workflow with the sources it calls", async () => {
    const model = await resolve(unresolvedSourceFlows);
    const markdown = arazzoWorkflowToMarkdown(model, "buy-pet");

    expect(markdown.startsWith("# Buy a pet\n\nFrom Checkout, version 1.0.0 (Arazzo 1.0.1).")).toBe(true);
    expect(markdown).toContain("## Step 1: `find`");
    expect(markdown).toContain("## Sources");
    expect(markdown).toContain("- `petstore` (OpenAPI)");
    expect(markdown).toContain("- `payments` (OpenAPI)");
  });

  it("throws for a workflow the document doesn't have", async () => {
    const model = await resolve(adoptionFlows);
    expect(() => arazzoWorkflowToMarkdown(model, "nope")).toThrow(/no workflow "nope"/);
  });
});

describe("Arazzo through the document helpers", () => {
  it("lists one target per workflow and serializes each", async () => {
    const model = await resolve(adoptionFlows);
    const targets = listDocumentTargets(model);

    expect(targets.map((entry) => entry.key)).toEqual(["add-pet", "add-and-remove"]);
    expect(targets[0]).toMatchObject({
      label: "Add a pet and read it back",
      summary: "Creates a pet, then fetches it by the ID the store assigned.",
      target: { kind: "workflow", id: "add-pet" },
    });
    expect(documentToMarkdown(model, targets[1].target)).toBe(arazzoWorkflowToMarkdown(model, "add-and-remove"));
    expect(documentToMarkdown(model)).toBe(arazzoToMarkdown(model));
  });

  it("builds an llms.txt index of workflows", async () => {
    const model = await resolve(adoptionFlows);
    expect(documentToLlmsTxt(model, { baseUrl: "https://docs.example.com/flows" })).toBe(
      [
        "# Pet adoption",
        "",
        "> Workflows for adding a pet to the store and cleaning up after it.",
        "",
        "## Workflows",
        "",
        "- [Add a pet and read it back](https://docs.example.com/flows/add-pet.md): Creates a pet, then fetches it by the ID the store assigned.",
        "- [Add a pet, then remove it](https://docs.example.com/flows/add-and-remove.md)",
        "",
      ].join("\n"),
    );
  });

  it("points a plain Arazzo document at the resolver", () => {
    expect(() => documentToMarkdown(adoptionFlows)).toThrow(/resolveArazzoDocument/);
    expect(() => listDocumentTargets(adoptionFlows)).toThrow(/resolveArazzoDocument/);
  });
});
