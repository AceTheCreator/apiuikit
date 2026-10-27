import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Arazzo from "../Arazzo";
import { ArazzoRenderer } from "../ArazzoRenderer";
import { petCoupons } from "../../../helpers/tests/fixtures/arazzo";

const petsApi = {
  openapi: "3.1.0",
  info: { title: "Pets", version: "1" },
  paths: {
    "/pets": {
      get: {
        operationId: "listPets",
        summary: "List pets",
        description: "Every pet in the store.",
        responses: { 200: { description: "OK" } },
      },
    },
  },
};

const flows = (fields: Record<string, unknown> = {}) => ({
  arazzo: "1.0.1",
  info: { title: "Pet flows", version: "1.0.0", description: "Adopting pets." },
  sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }],
  workflows: [{ workflowId: "adopt", summary: "Adopt a pet", steps: [{ stepId: "list", operationId: "listPets" }] }],
  ...fields,
});

/** A condition, matched on its whole text: its expressions are chips of their own. */
const condition = (text: string) => (_: string, element: Element | null) => element?.tagName === "CODE" && element.textContent === text;

/** The page loads lazily and resolves asynchronously: wait for the first workflow heading. */
const waitForPage = (title: string) => screen.findByRole("heading", { name: title }, { timeout: 5000 });

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ArazzoRenderer", () => {
  it("renders the official pet-coupons example end to end, every step linked to its source", async () => {
    const onDiagnostics = vi.fn();
    render(<ArazzoRenderer raw={petCoupons.arazzo} sources={petCoupons.sources} onDiagnostics={onDiagnostics} />);

    await waitForPage("Apply a coupon to a pet order.");
    expect(onDiagnostics).toHaveBeenCalledWith([]);
    expect(screen.getByRole("heading", { name: "Petstore - Apply Coupons" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Buy an available pet if one is available." })).toBeInTheDocument();

    const applyCoupon = screen.getByRole("region", { name: "Workflow apply-coupon" });
    const steps = within(applyCoupon).getAllByRole("listitem").filter((item) => item.id.startsWith("step-"));
    expect(steps.map((step) => step.id)).toEqual([
      "step-apply-coupon/find-pet",
      "step-apply-coupon/find-coupons",
      "step-apply-coupon/place-order",
    ]);
    expect(within(steps[0]).getByText("/pet/findByTags")).toBeInTheDocument();
    expect(within(steps[0]).getByText("pet-coupons")).toBeInTheDocument();
    expect(within(steps[1]).getByText("$steps.find-pet.outputs.my_pet_id")).toBeInTheDocument();
    expect(within(steps[2]).getByText("Runs workflow")).toBeInTheDocument();
    expect(within(steps[2]).getByRole("button", { name: "place-order" })).toBeInTheDocument();
  });

  it("reports an unreadable document through onDiagnostics and renders nothing", async () => {
    const onDiagnostics = vi.fn();
    const { container } = render(<ArazzoRenderer raw="openapi: 3.0.0" onDiagnostics={onDiagnostics} />);
    await waitFor(() => expect(onDiagnostics).toHaveBeenCalled());
    expect(onDiagnostics.mock.calls[0][0][0].message).toBe("This is an OpenAPI document, not an Arazzo document.");
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Arazzo", () => {
  it("shows each step's operation as a one-line header, and opens it from its own source in the side panel", async () => {
    render(<Arazzo arazzo={flows()} sources={{ pets: petsApi }} />);
    await waitForPage("Adopt a pet");

    const header = screen.getByRole("button", { name: "GET /pets, List pets, from pets" });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Every pet in the store.")).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    const description = await screen.findByText("Every pet in the store.");
    // In the document's portal (where the side panel lives), not inline in the step.
    expect(description.closest(".arazzo-portal-root")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
    expect(header).toHaveAttribute("aria-expanded", "false");
  });

  it("shows an unresolved source and its unlinked step, and renders the rest", async () => {
    const onDiagnostics = vi.fn();
    const document = flows({
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "store", url: "./store.yaml", type: "openapi" }],
      workflows: [{
        workflowId: "adopt",
        summary: "Adopt a pet",
        steps: [
          { stepId: "list", operationId: "listPets" },
          { stepId: "order", operationId: "$sourceDescriptions.store.placeOrder" },
        ],
      }],
    });
    render(<Arazzo arazzo={document} sources={{ pets: petsApi }} onDiagnostics={onDiagnostics} />);
    await waitForPage("Adopt a pet");

    const chip = document_getById("source-store");
    expect(within(chip).getByText("Unavailable")).toBeInTheDocument();
    expect(within(document_getById("sources")).getByText(/isn't in `sources`, and a relative url can only be fetched when `baseUrl` is set/)).toBeInTheDocument();

    const order = document_getById("step-adopt/order");
    expect(within(order).getByText("$sourceDescriptions.store.placeOrder")).toBeInTheDocument();
    expect(within(order).getByText("Unavailable")).toBeInTheDocument();
    expect(within(document_getById("step-adopt/list")).getByText("/pets")).toBeInTheDocument();
    expect(onDiagnostics.mock.calls[0][0]).toEqual([expect.objectContaining({ path: ["sourceDescriptions", "1"] })]);
  });

  it("renders criteria, every action type, and inputs and outputs", async () => {
    const document = flows({
      workflows: [
        {
          workflowId: "adopt",
          summary: "Adopt a pet",
          inputs: { type: "object", properties: { petName: { type: "string", description: "Who to adopt" } } },
          steps: [{
            stepId: "list",
            operationId: "listPets",
            parameters: [{ name: "Authorization", in: "header", value: "Bearer {$inputs.token}" }],
            successCriteria: [{ condition: "$statusCode == 200" }, { context: "$response.body", type: "jsonpath", condition: "$[?count(@.pets) > 0]" }],
            onSuccess: [
              { name: "again", type: "goto", stepId: "list", criteria: [{ condition: "$response.body#/next != null" }] },
              { name: "elsewhere", type: "goto", workflowId: "cleanup" },
              { name: "done", type: "end" },
            ],
            onFailure: [{ name: "backoff", type: "retry", retryAfter: 5, retryLimit: 3 }],
            outputs: { first: "$response.body#/0/name" },
          }],
          outputs: { adopted: "$steps.list.outputs.first" },
        },
        { workflowId: "cleanup", summary: "Clean up", steps: [{ stepId: "list", operationId: "listPets" }] },
      ],
    });
    render(<Arazzo arazzo={document} sources={{ pets: petsApi }} />);
    await waitForPage("Adopt a pet");
    const step = document_getById("step-adopt/list");

    expect(within(step).getByText(condition("$statusCode == 200"))).toBeInTheDocument();
    expect(within(step).getByText(/matches jsonpath/)).toBeInTheDocument();
    expect(within(step).getByText("$inputs.token")).toBeInTheDocument();
    expect(within(step).getByText("Go to step")).toBeInTheDocument();
    expect(within(step).getByText("Go to workflow")).toBeInTheDocument();
    expect(within(step).getByText("End the workflow")).toBeInTheDocument();
    expect(within(step).getByText("Retry after 5s, up to 3 times")).toBeInTheDocument();
    expect(within(step).getByText(condition("$response.body#/next != null"))).toBeInTheDocument();
    expect(within(step).getByText("$response.body#/0/name")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Workflow adopt" })).getByText("petName")).toBeInTheDocument();
    expect(screen.getByText("Workflow outputs")).toBeInTheDocument();
    expect(screen.getByText("$steps.list.outputs.first")).toBeInTheDocument();
  });

  it("links to local workflows, and expands workflows from Arazzo sources inline", async () => {
    const shared = {
      arazzo: "1.0.1",
      info: { title: "Shared", version: "1" },
      sourceDescriptions: [{ name: "pets", url: "https://example.com/pets.json", type: "openapi" }],
      workflows: [{ workflowId: "remote", summary: "A shared flow", steps: [{ stepId: "remote-list", operationId: "listPets" }] }],
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(petsApi))));
    const onLocationChange = vi.fn();
    const document = flows({
      sourceDescriptions: [{ name: "pets", url: "./pets.yaml", type: "openapi" }, { name: "shared", url: "./shared.yaml", type: "arazzo" }],
      workflows: [
        { workflowId: "adopt", summary: "Adopt a pet", steps: [
          { stepId: "prepare", workflowId: "cleanup" },
          { stepId: "share", workflowId: "$sourceDescriptions.shared.remote" },
        ] },
        { workflowId: "cleanup", summary: "Clean up", steps: [{ stepId: "list", operationId: "listPets" }] },
      ],
    });
    render(<Arazzo arazzo={document} sources={{ pets: petsApi, shared }} onLocationChange={onLocationChange} />);
    await waitForPage("Adopt a pet");

    fireEvent.click(within(document_getById("step-adopt/prepare")).getByRole("button", { name: "cleanup" }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(onLocationChange).toHaveBeenLastCalledWith({ tab: "workflows", key: "cleanup" }));

    const share = document_getById("step-adopt/share");
    const toggle = within(share).getByRole("button", { name: /Runs workflow\s*remote/ });
    fireEvent.click(toggle);
    expect(within(share).getByRole("heading", { name: "A shared flow" })).toBeInTheDocument();
    // Its anchors are scoped under the step, so they can't collide with the page's own.
    expect(share.querySelector('[id$="step-remote/remote-list"]')?.id).toBe("step-adopt/share::step-remote/remote-list");
  });

  it("loads sources through loadSource, or fetches them against baseUrl", async () => {
    const loadSource = vi.fn(async () => petsApi);
    const { unmount } = render(<Arazzo arazzo={flows()} loadSource={loadSource} baseUrl="https://example.com/flows/main.yaml" />);
    await waitForPage("Adopt a pet");
    expect(loadSource).toHaveBeenCalledWith("https://example.com/flows/pets.yaml", expect.objectContaining({ name: "pets" }));
    expect(screen.getByText("/pets")).toBeInTheDocument();
    unmount();

    const fetch = vi.fn(async () => new Response(JSON.stringify(petsApi)));
    vi.stubGlobal("fetch", fetch);
    render(<Arazzo arazzo={flows()} baseUrl="https://example.com/flows/" />);
    await waitForPage("Adopt a pet");
    expect(fetch).toHaveBeenCalledWith("https://example.com/flows/pets.yaml");
    expect(await screen.findByText("/pets")).toBeInTheDocument();
  });

  it("doesn't re-resolve when re-rendered with an equal inline sources object or a new loadSource", async () => {
    const onDiagnostics = vi.fn();
    const document = flows();
    const { rerender } = render(<Arazzo arazzo={document} sources={{ pets: petsApi }} onDiagnostics={onDiagnostics} loadSource={async () => undefined} />);
    await waitForPage("Adopt a pet");
    await act(async () => {
      rerender(<Arazzo arazzo={document} sources={{ pets: petsApi }} onDiagnostics={onDiagnostics} loadSource={async () => undefined} />);
    });
    expect(onDiagnostics).toHaveBeenCalledTimes(1);
  });

  it("selects and scrolls to initialLocation", async () => {
    const onLocationChange = vi.fn();
    render(
      <Arazzo
        arazzo={flows()}
        sources={{ pets: petsApi }}
        initialLocation={{ tab: "workflows", key: "adopt/list" }}
        onLocationChange={onLocationChange}
      />,
    );
    await waitForPage("Adopt a pet");
    expect(onLocationChange).toHaveBeenCalledWith({ tab: "workflows", key: "adopt/list" });
    expect(document_getById("step-adopt/list").className).toContain("ring-1");
  });

  it("copies the page as Markdown from the top bar, unless show.copyMarkdown is off", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { unmount } = render(<Arazzo arazzo={flows()} sources={{ pets: petsApi }} />);
    await waitForPage("Adopt a pet");

    fireEvent.click(screen.getByRole("button", { name: "Copy as Markdown" }));
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: /Copy for LLM/ })));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("**Calls:** `GET /pets` (operation `listPets` in source `pets`)"));
    unmount();

    render(<Arazzo arazzo={flows()} sources={{ pets: petsApi }} config={{ show: { copyMarkdown: false } }} />);
    await waitForPage("Adopt a pet");
    expect(screen.queryByRole("button", { name: "Copy as Markdown" })).toBeNull();
  });
});

function document_getById(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`No element with id "${id}"`);
  return element;
}
