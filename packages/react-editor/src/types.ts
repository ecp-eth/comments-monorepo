import type { MentionItem } from "./extensions/types.js";

export * from "./extensions/types.js";

export type SearchSuggestionsFunction = (
  query: string,
) => Promise<MentionItem[]>;
