import { OpenAPIDocumentData } from "../types/openapi";
import { buildOpenAPISearchIndex } from "../helpers/openapiSearchIndex";
import { useFuseSearch, UseSpecSearchOptions } from "./useFuseSearch";

/** Mirrors useSpecSearch (AsyncAPI), built on buildOpenAPISearchIndex instead. */
export function useOpenAPISearch(openapi: OpenAPIDocumentData, options: UseSpecSearchOptions = {}) {
  return useFuseSearch(openapi, buildOpenAPISearchIndex, options);
}
