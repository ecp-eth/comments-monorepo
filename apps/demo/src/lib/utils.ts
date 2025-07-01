import { publicEnv } from "@/publicEnv";
import { formatAuthorLinkWithTemplate } from "@ecp.eth/shared/helpers";
import { AuthorType } from "@ecp.eth/shared/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Hex } from "viem";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAuthorLink(author: AuthorType) {
  return formatAuthorLinkWithTemplate(
    author,
    publicEnv.NEXT_PUBLIC_COMMENT_AUTHOR_URL,
  );
}

export function createRootCommentsQueryKey(
  author: Hex | undefined,
  targetUri: string,
) {
  return ["comments", author, targetUri];
}

export function createCommentRepliesQueryKey(
  author: Hex | undefined,
  commentId: Hex,
) {
  return ["comments", author, commentId];
}
