import { AsyncAPIDocumentData } from "../types/schema";
import { buildSearchIndex } from "../helpers/searchIndex";
import { useFuseSearch, UseSpecSearchOptions } from "./useFuseSearch";

export type { UseSpecSearchOptions };

export function useSpecSearch(asyncapi: AsyncAPIDocumentData, options: UseSpecSearchOptions = {}) {
  return useFuseSearch(asyncapi, buildSearchIndex, options);
}
