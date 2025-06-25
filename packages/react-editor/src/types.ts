import type { SearchSuggestionsFunction } from "./extensions/types.js";

export * from "./extensions/types.js";

export type EditorSuggestionsService = {
  search: SearchSuggestionsFunction;
};
