import type { EmbedConfigReactionSchemaType } from "./schemas/index.js";

/**
 * Built-in reaction presets for iframe configurators.
 *
 * Values are intentionally lowercase.
 */
export const EMBED_REACTION_PRESETS = [
  {
    value: "like",
    icon: "heart",
  },
  {
    value: "upvote",
    icon: "caret-up",
  },
  {
    value: "downvote",
    icon: "caret-down",
  },
  {
    value: "repost",
    icon: "repost",
  },
] as const satisfies readonly EmbedConfigReactionSchemaType[];

/**
 * Fallback reaction when no custom reactions are configured.
 */
export const EMBED_DEFAULT_REACTIONS = [
  {
    value: "like",
    icon: "heart",
  },
] as const satisfies readonly EmbedConfigReactionSchemaType[];

export const EMBED_REACTION_ICON_PRESETS = [
  "heart",
  "repost",
  "caret-up",
  "caret-down",
] as const;
