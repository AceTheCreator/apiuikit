/*
 * Shared Arazzo fixtures, as raw text. `*.arazzo.yaml` / `*.openapi.yaml`
 * pairs are the official examples from the OAI Arazzo Specification repo
 * (https://github.com/OAI/Arazzo-Specification/tree/main/examples/1.0.0,
 * Apache-2.0), unmodified. Later phases (stories, playground examples) should
 * import from here rather than copying them.
 */
import petCouponsArazzo from "./pet-coupons.arazzo.yaml?raw";
import petCouponsOpenAPI from "./pet-coupons.openapi.yaml?raw";
import bnplArazzo from "./bnpl-arazzo.yaml?raw";
import bnplOpenAPI from "./bnpl-openapi.yaml?raw";

/** One workflow calling another, a `$components` parameter with a value override, and `$ref` inputs. Source: `pet-coupons` at `./pet-coupons.openapi.yaml`. */
export const petCoupons = { arazzo: petCouponsArazzo, sources: { "pet-coupons": petCouponsOpenAPI } };

/** Goto/end actions, jsonpath criteria, and a JSON-string payload with embedded expressions. Source: `BnplApi` at an absolute raw.githubusercontent.com URL. */
export const bnpl = { arazzo: bnplArazzo, sources: { BnplApi: bnplOpenAPI } };
