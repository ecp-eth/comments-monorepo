import type { MentionItem } from "./extensions/types";

export * from "./extensions/types";

export type SearchSuggestionsFunction = (
  query: string,
) => Promise<MentionItem[]>;
