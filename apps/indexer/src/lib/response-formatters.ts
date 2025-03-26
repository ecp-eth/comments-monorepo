import { type Hex } from "viem";
import {
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  HexSchema,
  IndexerAPIModerationChangeModerationStatusOnCommentSchemaType,
} from "@ecp.eth/sdk/schemas";
import { ensDataResolver, type ResolvedEnsData } from "./ens-data-resolver";
import type { CommentSelectType } from "ponder:schema";
import {
  farcasterDataResolver,
  ResolvedFarcasterData,
} from "./farcaster-data-resolver";
import { getCommentCursor } from "@ecp.eth/sdk";
import { env } from "../env";

type CommentFromDB = CommentSelectType & { replies?: CommentSelectType[] };

/**
 * This function resolves ENS and Farcaster user data of comment authors and formats the response for API
 */
export async function resolveUserDataAndFormatListCommentsResponse({
  comments,
  limit,
  replyLimit,
  previousComment,
}: {
  comments: CommentFromDB[];
  limit: number;
  replyLimit: number;
  previousComment: CommentSelectType | undefined;
}): Promise<IndexerAPIListCommentsSchemaType> {
  if (comments.length === 0) {
    return {
      results: [],
      pagination: {
        limit,
        hasPrevious: false,
        hasNext: false,
      },
      extra: {
        moderationEnabled: env.MODERATION_ENABLED,
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

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData] =
    await Promise.all([
      ensDataResolver.loadMany([...authorIds]),
      farcasterDataResolver.loadMany([...authorIds]),
    ]);

  const nextComment = comments[comments.length - 1];
  const results = comments.slice(0, limit);
  const startComment = results[0];
  const endComment = results[results.length - 1];

  return {
    results: results.map((comment) => {
      const replies = comment.replies ?? [];
      const resolvedAuthorEnsData = resolveUserData(
        resolvedAuthorsEnsData,
        comment.author
      );
      const resolvedAuthorFarcasterData = resolveUserData(
        resolvedAuthorsFarcasterData,
        comment.author
      );

      const slicedReplies = replies.slice(0, replyLimit);
      const startReply = slicedReplies[0];
      const endReply = slicedReplies[slicedReplies.length - 1];

      return {
        ...formatComment(comment),
        author: formatAuthor(
          comment.author,
          resolvedAuthorEnsData,
          resolvedAuthorFarcasterData
        ),
        replies: {
          results: slicedReplies.map((reply) => {
            const resolvedAuthorEnsData = resolveUserData(
              resolvedAuthorsEnsData,
              reply.author
            );
            const resolvedAuthorFarcasterData = resolveUserData(
              resolvedAuthorsFarcasterData,
              reply.author
            );

            return {
              ...formatComment(reply),
              author: formatAuthor(
                reply.author,
                resolvedAuthorEnsData,
                resolvedAuthorFarcasterData
              ),
              // do not go deeper than first level of replies
              replies: {
                results: [],
                pagination: {
                  limit: 0,
                  hasNext: false,
                  hasPrevious: false,
                },
              },
            };
          }),
          pagination: {
            limit: replyLimit,
            hasNext: replies.length > replyLimit,
            hasPrevious: false,
            startCursor: startReply
              ? getCommentCursor(startReply.id as Hex, startReply.timestamp)
              : undefined,
            endCursor: endReply
              ? getCommentCursor(endReply.id as Hex, endReply.timestamp)
              : undefined,
          },
        },
      };
    }),
    pagination: {
      limit,
      hasNext: nextComment !== endComment,
      hasPrevious: !!previousComment,
      startCursor: startComment
        ? getCommentCursor(startComment.id as Hex, startComment.timestamp)
        : undefined,
      endCursor: endComment
        ? getCommentCursor(endComment.id as Hex, endComment.timestamp)
        : undefined,
    },
    extra: {
      moderationEnabled: env.MODERATION_ENABLED,
    },
  };
}

/**
 * This function formats the author data for API response
 */
export function formatAuthor(
  author: Hex,
  resolvedEnsData: ResolvedEnsData | null | undefined,
  resolvedFarcasterData: ResolvedFarcasterData | null | undefined
): IndexerAPIAuthorDataSchemaType {
  return {
    address: author,
    ens: resolvedEnsData?.ens,
    farcaster: resolvedFarcasterData?.farcaster,
  };
}

function formatComment(comment: CommentSelectType) {
  return {
    ...comment,
    id: HexSchema.parse(comment.id),
    content: comment.deletedAt ? "[deleted]" : comment.content,
    cursor: getCommentCursor(comment.id as Hex, comment.timestamp),
  };
}

function resolveUserData<
  TListItem extends ResolvedEnsData | ResolvedFarcasterData,
>(list: (TListItem | Error)[], address: Hex): TListItem | null {
  const lowercasedAddress = address.toLowerCase();

  return (
    list.find(
      (item): item is TListItem =>
        !(item instanceof Error) &&
        item.address.toLowerCase() === lowercasedAddress
    ) ?? null
  );
}

export async function resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
  comment: CommentSelectType
): Promise<IndexerAPIModerationChangeModerationStatusOnCommentSchemaType> {
  const [resolvedEnsData, resolvedFarcasterData] = await Promise.all([
    ensDataResolver.load(comment.author),
    farcasterDataResolver.load(comment.author),
  ]);

  return {
    ...formatComment(comment),
    author: formatAuthor(
      comment.author,
      resolvedEnsData,
      resolvedFarcasterData
    ),
  };
}
