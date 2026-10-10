import type { ChannelAddressParameterDetail } from "../components/ChannelAddress";
import type { QueryParameterDetail } from "../components/QueryParameters";
import type { OpenAPIParameterData } from "../types/openapi";

// OpenAPI carries a parameter's type/default/enum/example under its
// `schema`, not on the parameter itself — adapt it into the shape the
// address bar's tooltips and the query chip's list both read.
function toParameterDetail(param: OpenAPIParameterData): ChannelAddressParameterDetail {
  const schema = param.schema as { type?: string; default?: unknown; enum?: unknown[] } | undefined;
  return {
    description: param.description,
    type: schema?.type,
    default: schema?.default !== undefined ? String(schema.default) : undefined,
    enum: schema?.enum?.map(String),
    examples: "example" in param && param.example !== undefined ? [String(param.example)] : undefined,
  };
}

export function toChannelAddressParameters(parameters: OpenAPIParameterData[]): Record<string, ChannelAddressParameterDetail> {
  const result: Record<string, ChannelAddressParameterDetail> = {};
  for (const param of parameters) {
    result[param.name] = toParameterDetail(param);
  }
  return result;
}

// Query parameters aren't otherwise visible anywhere in the panel — PathOperation
// keeps them out of the Parameters tab because they belong to the address. They
// used to be spelled into it (`?limit={limit}&cursor={cursor}…`), which is what
// overflowed the header on any operation with more than a couple; the chip
// collapses them to a count instead, and gives each one room for its details.
export function toQueryParameters(parameters: OpenAPIParameterData[]): QueryParameterDetail[] {
  return parameters
    .filter((param) => param.in === "query")
    .map((param) => ({ ...toParameterDetail(param), name: param.name, required: param.required }));
}
