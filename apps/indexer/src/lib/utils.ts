import _normalizeUrl from "normalize-url";
import type { CommentSelectType } from "ponder:schema";

export function normalizeUrl(url: string) {
  return _normalizeUrl(url, {
    sortQueryParameters: true,
    removeTrailingSlash: true,
    stripHash: true,
    removeSingleSlash: true,
  });
}

export function formatComment(comment: CommentSelectType): CommentSelectType {
  return {
    ...comment,
    content: comment.deletedAt ? "[deleted]" : comment.content,
  };
}
