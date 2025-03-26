import { publicEnv } from "../env";
import { formatAuthorLinkWithTemplate } from "@ecp.eth/shared/helpers";
import { AuthorType } from "@ecp.eth/shared/types";

export function formatAuthorLink(author: AuthorType): string | null {
  return formatAuthorLinkWithTemplate(
    author,
    publicEnv.EXPO_PUBLIC_COMMENT_AUTHOR_URL
  );
}

/**
 * Merge consecutive line breaks into a single line break
 */
export function mergeLineBreaks(text: string): string {
  return text.split("\n").filter(Boolean).join("\n");
}
