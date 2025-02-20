import type { Hex } from "viem";
import {
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  HexSchema,
} from "@ecp.eth/sdk/schemas";
import { ensDataResolver, type ResolvedEnsData } from "./ens-data-resolver";
import type { CommentSelectType } from "ponder:schema";
import {
  farcasterDataResolver,
  ResolvedFarcasterData,
} from "./farcaster-data-resolver";

type CommentFromDB = CommentSelectType & { replies?: CommentSelectType[] };

/**
 * This function resolves ENS and Farcaster user data of comment authors and formats the response for API
 */
export async function resolveUserDataAndFormatListCommentsResponse({
  comments,
  limit,
  offset,
  replyLimit,
}: {
  comments: CommentFromDB[];
  limit: number;
  offset: number;
  replyLimit: number;
}): Promise<IndexerAPIListCommentsSchemaType> {
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

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData] =
    await Promise.all([
      ensDataResolver.loadMany([...authorIds]),
      farcasterDataResolver.loadMany([...authorIds]),
    ]);

  return {
    results: comments.slice(0, limit).map((comment) => {
      const replies = comment.replies ?? [];
      const resolvedAuthorEnsData = resolveUserData(
        resolvedAuthorsEnsData,
        comment.author
      );
      const resolvedAuthorFarcasterData = resolveUserData(
        resolvedAuthorsFarcasterData,
        comment.author
      );

      return {
        ...formatComment(comment),
        author: formatAuthor(
          comment.author,
          resolvedAuthorEnsData,
          resolvedAuthorFarcasterData
        ),
        replies: {
          results: replies.slice(0, replyLimit).map((reply) => {
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
