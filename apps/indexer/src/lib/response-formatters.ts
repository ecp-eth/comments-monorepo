import { type z } from "zod";
import {
  type IndexerAPIListCommentsSchemaType,
  type IndexerAPIAuthorDataSchemaType,
  type IndexerAPIModerationChangeModerationStatusOnCommentSchemaType,
  type IndexerAPICommentSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { type Hex, HexSchema } from "@ecp.eth/sdk/core/schemas";
import type { CommentSelectType } from "ponder:schema";
import { ensByAddressResolverService } from "../services/ens-by-address-resolver";
import { farcasterByAddressResolverService } from "../services/farcaster-by-address-resolver";
import { getCommentCursor } from "@ecp.eth/sdk/indexer";
import { env } from "../env";
import type {
  ReplyCountsByParentIdResolverKey,
  ResolvedENSData,
  ResolvedFarcasterData,
} from "../services/resolvers";
import type {
  CommentModerationLabel,
  LowercasedHex,
  ModerationStatus,
} from "../services/types";
import { replyCountsByParentIdResolverService } from "../services/reply-counts-by-parent-id-resolver";

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
  replyCountsConditions,
}: {
  comments: CommentFromDB[];
  limit: number;
  replyLimit: number;
  previousComment: CommentSelectType | undefined;
  replyCountsConditions: {
    mode: "flat" | "nested";
    app?: Hex;
    isDeleted?: boolean;
    commentType?: number;
    excludeModerationLabels?: CommentModerationLabel[];
    moderationScore?: number;
    moderationStatus?: ModerationStatus[];
  };
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

    for (const reply of comment.replies ?? comment.flatReplies ?? []) {
      if (reply.author) {
        authorAddresses.add(reply.author);
      }
    }
  }

  const dedupedAuthorAddresses = [...authorAddresses];

  const [resolvedAuthorsEnsData, resolvedAuthorsFarcasterData, replyCounts] =
    await Promise.all([
      ensByAddressResolverService.loadMany([...dedupedAuthorAddresses]),
      farcasterByAddressResolverService.loadMany([...dedupedAuthorAddresses]),
      mapReplyCountsByCommentId(comments, replyCountsConditions),
    ]);

  const nextComment = comments[comments.length - 1];
  const results = comments.slice(0, limit);
  const startComment = results[0];
  const endComment = results[results.length - 1];

  const resolveUserDataAndFormatSingleCommentResponse =
    createUserDataAndFormatSingleCommentResponseResolver({
      replyLimit,
      resolvedAuthorsEnsData,
      resolvedAuthorsFarcasterData,
      replyCounts,
    });

  return {
    results: results.map(resolveUserDataAndFormatSingleCommentResponse),
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

export function createUserDataAndFormatSingleCommentResponseResolver({
  replyCounts,
  replyLimit,
  resolvedAuthorsEnsData,
  resolvedAuthorsFarcasterData,
}: {
  replyLimit: number;
  resolvedAuthorsEnsData: (ResolvedENSData | Error | null)[];
  resolvedAuthorsFarcasterData: (ResolvedFarcasterData | Error | null)[];
  replyCounts: Record<LowercasedHex, number>;
}) {
  return (
    comment: CommentFromDB,
  ): IndexerAPIListCommentsSchemaType["results"][number] => {
    const {
      replies: nestedReplies,
      flatReplies,
      viewerReactions,
      author,
    } = comment;

    const resolvedAuthorEnsData = resolveUserData(
      resolvedAuthorsEnsData,
      author,
    );
    const resolvedAuthorFarcasterData = resolveUserData(
      resolvedAuthorsFarcasterData,
      author,
    );

    const replies = nestedReplies ?? flatReplies ?? [];
    const slicedReplies = replies.slice(0, replyLimit);
    const startReply = slicedReplies[0];
    const endReply = slicedReplies[slicedReplies.length - 1];

    return {
      ...formatComment(comment, resolvedAuthorEnsData),
      author: formatAuthor(
        author,
        resolvedAuthorEnsData,
        resolvedAuthorFarcasterData,
      ),
      viewerReactions: formatViewerReactions(viewerReactions),
      replies: {
        extra: {
          moderationEnabled: env.MODERATION_ENABLED,
          moderationKnownReactions: Array.from(env.MODERATION_KNOWN_REACTIONS),
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
            ...formatComment(reply, resolvedAuthorEnsData),
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
                count: 0,
              },
              extra: {
                moderationEnabled: env.MODERATION_ENABLED,
                moderationKnownReactions: Array.from(
                  env.MODERATION_KNOWN_REACTIONS,
                ),
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
          count: replyCounts[comment.id.toLowerCase() as LowercasedHex] ?? 0,
        },
      },
    };
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

/**
 * Creates a hash map of lower cased comment ids to reply counts
 */
export async function mapReplyCountsByCommentId(
  /**
   * Comments in the order their counts were resolver
   */
  comments: { id: Hex }[],
  replyCountsConditions: Omit<ReplyCountsByParentIdResolverKey, "parentId">,
): Promise<Record<LowercasedHex, number>> {
  const replyCounts = await replyCountsByParentIdResolverService.loadMany(
    comments.map((comment) => ({
      parentId: comment.id,
      ...replyCountsConditions,
    })),
  );
  const result: Record<Hex, number> = {};

  for (let i = 0; i < comments.length; i++) {
    const loweredCommentId = comments[i]!.id.toLowerCase() as LowercasedHex;
    const countOrError = replyCounts[i];

    if (typeof countOrError === "number") {
      result[loweredCommentId] = countOrError;
    } else {
      result[loweredCommentId] = 0;
    }
  }

  return result;
}

function formatComment(
  comment: CommentSelectType & { viewerReactions?: CommentSelectType[] },
  resolvedEnsData: ResolvedENSData | null | undefined,
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
    path: resolvedEnsData
      ? [resolvedEnsData.name, comment.path.split("/")[1]].join("/")
      : comment.path,
  };
}

function formatViewerReactions(
  viewerReactions?: CommentSelectType[],
): Record<string, IndexerAPICommentSchemaType[]> {
  return (
    viewerReactions?.reduce(
      (acc, reaction) => {
        const reactionFormatted: IndexerAPICommentSchemaType = {
          ...formatComment(reaction, undefined),
          author: {
            address: reaction.author,
          },
          replies: {
            extra: {
              moderationEnabled: env.MODERATION_ENABLED,
              moderationKnownReactions: Array.from(
                env.MODERATION_KNOWN_REACTIONS,
              ),
            },
            pagination: {
              limit: 0,
              hasNext: false,
              hasPrevious: false,
              count: 0,
            },
            results: [],
          },
          viewerReactions: {},
        };

        const container = (acc[reaction.content] = acc[reaction.content] ?? []);
        container.push(reactionFormatted);

        return acc;
      },
      {} as Record<string, IndexerAPICommentSchemaType[]>,
    ) ?? {}
  );
}

export function resolveUserData<
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
    ensByAddressResolverService.load(comment.author),
    farcasterByAddressResolverService.load(comment.author),
  ]);

  return {
    ...formatComment(comment, resolvedEnsData),
    author: formatAuthor(
      comment.author,
      resolvedEnsData,
      resolvedFarcasterData,
    ),
    replies: {
      extra: {
        moderationEnabled: env.MODERATION_ENABLED,
        moderationKnownReactions: Array.from(env.MODERATION_KNOWN_REACTIONS),
      },
      pagination: {
        limit: 0,
        hasNext: false,
        hasPrevious: false,
        count: 0,
      },
      results: [],
    },
  };
}

/**
 * This function formats the response using a zod schema.
 * It respects the schema's input and output shape. Can be used to transform json incompatible data to json compatible data.
 * @param schema - The zod schema to use for formatting the response.
 * @param responseData - The data to format.
 * @returns The formatted response.
 */
export function formatResponseUsingZodSchema<T extends z.ZodType>(
  schema: T,
  responseData: z.input<T>,
): z.output<T> {
  return schema.parse(responseData);
}
