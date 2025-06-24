import {
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  type IndexerAPIModerationChangeModerationStatusOnCommentSchemaType,
  type IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import type { CommentSelectType } from "ponder:schema";
import {
  ensByAddressResolver,
  type ResolvedENSData,
} from "../resolvers/ens-by-address-resolver";
import {
  farcasterByAddressResolver,
  type ResolvedFarcasterData,
} from "../resolvers/farcaster-by-address-resolver";
import { getCommentCursor } from "@ecp.eth/sdk/indexer";
import { env } from "../env";

type CommentFromDB = CommentSelectType & {
  replies?: CommentSelectType[];
  flatReplies?: CommentSelectType[];
  viewerReactions?: CommentSelectType[];
};

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
        moderationKnownReactions: Array.from(env.MODERATION_KNOWN_REACTIONS),
      },
    };
  }

  const authorAddresses = new Set<Hex>();

  for (const comment of comments) {
    if (comment.author) {
      authorAddresses.add(comment.author);
    }

    for (const reply of comment.replies ?? []) {
      if (reply.author) {
        authorAddresses.add(reply.author);
      }
    }
  }

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData] =
    await Promise.all([
      ensByAddressResolver.loadMany([...authorAddresses]),
      farcasterByAddressResolver.loadMany([...authorAddresses]),
    ]);

  const nextComment = comments[comments.length - 1];
  const results = comments.slice(0, limit);
  const startComment = results[0];
  const endComment = results[results.length - 1];

  return {
    results: results.map(
      ({
        replies: nestedReplies,
        flatReplies,
        viewerReactions,
        ...comment
      }) => {
        const replies = nestedReplies ?? flatReplies ?? [];
        const resolvedAuthorEnsData = resolveUserData(
          resolvedAuthorsEnsData,
          comment.author,
        );
        const resolvedAuthorFarcasterData = resolveUserData(
          resolvedAuthorsFarcasterData,
          comment.author,
        );

        const slicedReplies = replies.slice(0, replyLimit);
        const startReply = slicedReplies[0];
        const endReply = slicedReplies[slicedReplies.length - 1];

        return {
          ...formatComment(comment),
          author: formatAuthor(
            comment.author,
            resolvedAuthorEnsData,
            resolvedAuthorFarcasterData,
          ),
          viewerReactions: formatViewerReactions(viewerReactions),
          replies: {
            extra: {
              moderationEnabled: env.MODERATION_ENABLED,
              moderationKnownReactions: Array.from(
                env.MODERATION_KNOWN_REACTIONS,
              ),
            },
            results: slicedReplies.map((reply) => {
              const resolvedAuthorEnsData = resolveUserData(
                resolvedAuthorsEnsData,
                reply.author,
              );
              const resolvedAuthorFarcasterData = resolveUserData(
                resolvedAuthorsFarcasterData,
                reply.author,
              );

              return {
                ...formatComment(reply),
                author: formatAuthor(
                  reply.author,
                  resolvedAuthorEnsData,
                  resolvedAuthorFarcasterData,
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
                ? getCommentCursor(startReply.id as Hex, startReply.createdAt)
                : undefined,
              endCursor: endReply
                ? getCommentCursor(endReply.id as Hex, endReply.createdAt)
                : undefined,
            },
          },
        };
      },
    ),
    pagination: {
      limit,
      hasNext: nextComment !== endComment,
      hasPrevious: !!previousComment,
      startCursor: startComment
        ? getCommentCursor(startComment.id as Hex, startComment.createdAt)
        : undefined,
      endCursor: endComment
        ? getCommentCursor(endComment.id as Hex, endComment.createdAt)
        : undefined,
    },
    extra: {
      moderationEnabled: env.MODERATION_ENABLED,
      moderationKnownReactions: Array.from(env.MODERATION_KNOWN_REACTIONS),
    },
  };
}

/**
 * This function formats the author data for API response
 */
export function formatAuthor(
  author: Hex,
  resolvedEnsData: ResolvedENSData | null | undefined,
  resolvedFarcasterData: ResolvedFarcasterData | null | undefined,
): IndexerAPIAuthorDataSchemaType {
  return {
    address: author,
    ens: resolvedEnsData ?? undefined,
    farcaster: resolvedFarcasterData ?? undefined,
  };
}

function formatComment(
  comment: CommentSelectType & { viewerReactions?: CommentSelectType[] },
) {
  return {
    ...comment,
    id: HexSchema.parse(comment.id),
    content: comment.deletedAt ? "[deleted]" : comment.content,
    metadata: comment.metadata ?? [],
    hookMetadata: comment.hookMetadata ?? [],
    cursor: getCommentCursor(comment.id as Hex, comment.createdAt),
    viewerReactions: formatViewerReactions(comment.viewerReactions),
    reactionCounts: comment.reactionCounts ?? {},
  };
}

function formatViewerReactions(
  viewerReactions?: CommentSelectType[],
): Record<string, IndexerAPICommentSchemaType[]> {
  return (
    viewerReactions?.reduce(
      (acc, reaction) => {
        const reactionFormatted = {
          ...formatComment(reaction),
          author: {
            address: reaction.author,
          },
        };

        const container = (acc[reaction.content] = acc[reaction.content] ?? []);
        container.push(reactionFormatted);

        return acc;
      },
      {} as Record<string, IndexerAPICommentSchemaType[]>,
    ) ?? {}
  );
}

function resolveUserData<
  TListItem extends ResolvedENSData | ResolvedFarcasterData,
>(
  list: (TListItem | Error | null | undefined)[],
  address: Hex,
): TListItem | null {
  const lowercasedAddress = address.toLowerCase();

  return (
    list.find(
      (item): item is TListItem =>
        item != null &&
        !(item instanceof Error) &&
        item.address.toLowerCase() === lowercasedAddress,
    ) ?? null
  );
}

export async function resolveAuthorDataAndFormatCommentChangeModerationStatusResponse(
  comment: CommentSelectType,
): Promise<IndexerAPIModerationChangeModerationStatusOnCommentSchemaType> {
  const [resolvedEnsData, resolvedFarcasterData] = await Promise.all([
    ensByAddressResolver.load(comment.author),
    farcasterByAddressResolver.load(comment.author),
  ]);

  return {
    ...formatComment(comment),
    author: formatAuthor(
      comment.author,
      resolvedEnsData,
      resolvedFarcasterData,
    ),
  };
}
