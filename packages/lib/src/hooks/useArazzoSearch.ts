import { ArazzoModel } from "../types/arazzo";
import { buildArazzoSearchIndex } from "../helpers/arazzoSearchIndex";
import { useFuseSearch, UseSpecSearchOptions } from "./useFuseSearch";

/** Mirrors useOpenAPISearch, built on buildArazzoSearchIndex instead. */
export function useArazzoSearch(model: ArazzoModel, options: UseSpecSearchOptions = {}) {
  return useFuseSearch(model, buildArazzoSearchIndex, options);
}
