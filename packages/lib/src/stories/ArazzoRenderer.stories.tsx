import type { Meta, StoryObj } from "@storybook/react";
import { ArazzoRenderer } from "../containers/Arazzo/ArazzoRenderer";
import { bnpl, petCoupons } from "../helpers/tests/fixtures/arazzo";
import { widgetDocs } from "./sectionDocs";

const meta = {
  title: "Arazzo/ArazzoRenderer",
  component: ArazzoRenderer,
  tags: ["autodocs"],
  // Full-page widget, same as OpenAPI: see noCanvasDocsPage.
  parameters: {
    docs: widgetDocs({
      summary:
        "The same full page as `Arazzo`, starting from the document as text. Pass `raw` a YAML or JSON string; this needs `@usearazzo/parser` installed. Source documents can be text too. Validation problems, unavailable sources and unlinked steps are handed to `onDiagnostics`, and the page renders around them.",
      stories: "Pet Coupons or Buy Now Pay Later",
      code: `import { ArazzoRenderer } from "apiuikit";
import "apiuikit/style.css";

<ArazzoRenderer
  raw={arazzoYaml}
  sources={{ "pet-coupons": openapiYaml }}
  onDiagnostics={(diagnostics) => console.log(diagnostics)}
/>`,
    }),
  },
} satisfies Meta<typeof ArazzoRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The official OAI "pet coupons" example: three workflows, one reused by the other two. */
export const PetCoupons: Story = {
  args: {
    raw: petCoupons.arazzo,
    sources: petCoupons.sources,
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};

/** The official OAI "buy now, pay later" example: goto and end actions with JSONPath criteria. Its diagnostics are real mistakes in the example: an invalid expression, and parameters reading outputs their steps don't have. */
export const BuyNowPayLater: Story = {
  args: {
    raw: bnpl.arazzo,
    sources: bnpl.sources,
    onDiagnostics: (diagnostics) => console.log("diagnostics", diagnostics),
  },
};
