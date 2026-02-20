import { EMBED_DEFAULT_REACTIONS } from "@ecp.eth/sdk/embed/reactions";
import type { EmbedConfigReactionSchemaType } from "@ecp.eth/sdk/embed/schemas";

export type EmbedReaction = EmbedConfigReactionSchemaType;

export function getConfiguredReactions(
  reactions?: EmbedReaction[],
): EmbedReaction[] {
  const source = reactions?.length ? reactions : [...EMBED_DEFAULT_REACTIONS];
  const uniqueReactionValues = new Set<string>();
  const output: EmbedReaction[] = [];

  for (const reaction of source) {
    const value = normalizeReactionValue(reaction.value);
    const icon = normalizeReactionIcon(reaction.icon);

    if (!value || !icon || uniqueReactionValues.has(value)) {
      continue;
    }

    uniqueReactionValues.add(value);
    output.push({ value, icon });
  }

  return output.length ? output : [...EMBED_DEFAULT_REACTIONS];
}

export function normalizeReactionValue(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeReactionIcon(icon: string) {
  return icon.trim().replace(/_/g, "-").toLowerCase();
}

export function isLikelyEmojiIcon(icon: string) {
  return /[\p{Extended_Pictographic}\p{Emoji_Presentation}]/u.test(icon);
}

export function createPhosphorIconUrl(icon: string) {
  const slug = normalizeReactionIcon(icon);
  return `https://unpkg.com/@phosphor-icons/core/assets/regular/${encodeURIComponent(slug)}.svg`;
}
