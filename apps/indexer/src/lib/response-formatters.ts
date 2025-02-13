import type { Hex } from "viem";
import { ensDataResolver, type ResolvedName } from "./ens-data-resolver";
import type { APIListCommentsResponse } from "./types";
import type { CommentSelectType } from "ponder:schema";

type CommentFromDB = CommentSelectType & { replies?: CommentSelectType[] };

/**
 * This function resolves ENS names of comment authors and formats the response for API
 */
export async function resolveEnsAndFormatListCommentsResponse({
  comments,
  limit,
  offset,
  replyLimit,
}: {
  comments: CommentFromDB[];
  limit: number;
  offset: number;
  replyLimit: number;
}): Promise<APIListCommentsResponse> {
  if (comments.length === 0) {
    return {
      results: [],
      pagination: {
        limit,
        offset,
        hasMore: false,
      },
    };
  }

  const authorIds = new Set<Hex>();

  for (const comment of comments) {
    if (comment.author) {
      authorIds.add(comment.author);
    }

    for (const reply of comment.replies ?? []) {
      if (reply.author) {
        authorIds.add(reply.author);
      }
    }
  }

  const resolvedAuthorsEnsData = await ensDataResolver.loadMany([...authorIds]);

  return {
    results: comments.slice(0, limit).map((comment) => {
      const replies = comment.replies ?? [];
      const resolvedAuthor = comment.author
        ? resolvedAuthorsEnsData.find(
            (resolvedAuthorEnsData): resolvedAuthorEnsData is ResolvedName =>
              !(resolvedAuthorEnsData instanceof Error) &&
              resolvedAuthorEnsData?.address === comment.author
          )
        : null;

      return {
        ...formatComment(comment),
        author: formatAuthor(comment.author, resolvedAuthor),
        replies: {
          results: replies.slice(0, replyLimit).map((reply) => {
            const resolvedAuthor = reply.author
              ? resolvedAuthorsEnsData.find(
                  (
                    resolvedAuthorEnsData
                  ): resolvedAuthorEnsData is ResolvedName =>
                    !(resolvedAuthorEnsData instanceof Error) &&
                    resolvedAuthorEnsData?.address === reply.author
                )
              : undefined;

            return {
              ...formatComment(reply),
              author: formatAuthor(reply.author, resolvedAuthor),
              // do not go deeper than first level of replies
              replies: {
                results: [],
                pagination: {
                  offset: 0,
                  limit: 0,
                  hasMore: false,
                },
              },
            };
          }),
          pagination: {
            offset: 0,
            limit: replyLimit,
            hasMore: replies.length > replyLimit,
          },
        },
      };
    }),
    pagination: {
      limit,
      offset,
      hasMore: comments.length > limit,
    },
  };
}

function formatAuthor(
  author: Hex | null,
  resolvedName: ResolvedName | null | undefined
): null | ResolvedName {
  if (!author) {
    return null;
  }

  if (!resolvedName && author) {
    return {
      address: author,
    };
  }

  return resolvedName ?? null;
}

export function formatComment(comment: CommentSelectType): CommentSelectType {
  return {
    ...comment,
    content: comment.deletedAt ? "[deleted]" : comment.content,
  };
}
