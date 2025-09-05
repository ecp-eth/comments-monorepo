import * as Sentry from "@sentry/node";
import { ponder as Ponder } from "ponder:registry";
import {
  transformCommentParentId,
  transformCommentTargetUri,
} from "../lib/utils.ts";
import {
  commentModerationService,
  db,
  eventOutboxService,
  mutedAccountsManagementService,
} from "../services/index.ts";
import { type Hex } from "@ecp.eth/sdk/core/schemas";
import { zeroExSwapResolver } from "../lib/0x-swap-resolver.ts";
import {
  resolveCommentReferences,
  type ResolveCommentReferencesOptions,
} from "../lib/resolve-comment-references.ts";
import {
  ensByAddressResolverService,
  ensByNameResolverService,
  erc20ByAddressResolverService,
  erc20ByTickerResolverService,
  farcasterByAddressResolverService,
  farcasterByNameResolverService,
  urlResolverService,
} from "../services/index.ts";

import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { env } from "../env.ts";
import { eq } from "drizzle-orm";
import {
  ponderEventToCommentAddedEvent,
  ponderEventToCommentDeletedEvent,
  ponderEventToCommentHookMetadataSetEvent,
  ponderEventToCommentEditedEvent,
} from "../events/comment/index.ts";
import { schema } from "../../schema.ts";
import type { MetadataSetOperation } from "../events/shared/schemas.ts";

const resolverCommentReferences: ResolveCommentReferencesOptions = {
  ensByAddressResolver: ensByAddressResolverService,
  ensByNameResolver: ensByNameResolverService,
  erc20ByAddressResolver: erc20ByAddressResolverService,
  erc20ByTickerResolver: erc20ByTickerResolverService,
  farcasterByAddressResolver: farcasterByAddressResolverService,
  farcasterByNameResolver: farcasterByNameResolverService,
  urlResolver: urlResolverService,
};

export function initializeCommentEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
    if (event.args.content.length > env.COMMENT_CONTENT_LENGTH_LIMIT) {
      Sentry.captureMessage(
        `Comment content length limit exceeded, comment id: ${event.args.commentId}`,
        {
          level: "info",
          extra: {
            commentId: event.args.commentId,
            app: event.args.app,
            chainId: context.chain.id,
            author: event.args.author,
            txHash: event.transaction.hash,
            logIndex: event.log.logIndex,
            parentCommentId: event.args.parentId,
          },
        },
      );

      return;
    }

    const targetUri = transformCommentTargetUri(event.args.targetUri);

    if (
      await mutedAccountsManagementService.getMutedAccount(event.args.author)
    ) {
      return;
    }

    const zeroExSwap = await zeroExSwapResolver.resolveFromCommentAddedEvent({
      event,
      context,
    });

    await db.transaction(async (tx) => {
      const createdAt = new Date(Number(event.args.createdAt) * 1000);
      const updatedAt = new Date(Number(event.args.createdAt) * 1000);

      const parentId = transformCommentParentId(event.args.parentId);
      let rootCommentId: Hex | null = null;

      if (parentId) {
        const parentComment = await tx.query.comment.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, parentId);
          },
        });

        if (!parentComment) {
          Sentry.captureMessage(
            `Parent comment not found for commentId: ${event.args.commentId}, parentId: ${parentId}`,
            {
              level: "warning",
              extra: {
                commentId: event.args.commentId,
                parentId,
                targetUri,
                app: event.args.app,
                chainId: context.chain.id,
                author: event.args.author,
                txHash: event.transaction.hash,
                logIndex: event.log.logIndex,
                createdAt,
                updatedAt,
                parentCommentId: event.args.parentId,
              },
            },
          );

          return;
        }

        if (event.args.commentType === COMMENT_TYPE_REACTION) {
          const reactionType = event.args.content;

          await db
            .update(schema.comment)
            .set({
              reactionCounts: {
                ...parentComment.reactionCounts,
                [reactionType]:
                  (parentComment.reactionCounts?.[reactionType] ?? 0) + 1,
              },
            })
            .where(eq(schema.comment.id, parentId))
            .execute();
        }

        // if parent comment doesn't have a root comment id then it is a root comment itself
        rootCommentId = parentComment.rootCommentId ?? parentComment.id;
      }

      const referencesResolutionResult = await resolveCommentReferences(
        {
          chainId: context.chain.id,
          content: event.args.content,
        },
        resolverCommentReferences,
      );

      // We need to check if the comment already has a moderation status
      // this is useful during the reindex process
      const moderationResult = await commentModerationService.moderate(
        event.args,
        referencesResolutionResult.references,
      );

      const [insertedComment] = await db
        .insert(schema.comment)
        .values({
          id: event.args.commentId,
          content: event.args.content,
          metadata: event.args.metadata.slice(),
          hookMetadata: [], // Hook metadata still comes from separate events
          targetUri,
          parentId,
          rootCommentId,
          author: event.args.author,
          txHash: event.transaction.hash,
          createdAt,
          updatedAt,
          chainId: context.chain.id,
          app: event.args.app,
          logIndex: event.log.logIndex,
          channelId: event.args.channelId,
          commentType: event.args.commentType,
          moderationStatus: moderationResult.result.status,
          moderationStatusChangedAt: moderationResult.result.changedAt,
          moderationClassifierResult: moderationResult.result.classifier.labels,
          moderationClassifierScore: moderationResult.result.classifier.score,
          zeroExSwap,
          references: referencesResolutionResult.references,
          referencesResolutionStatus: referencesResolutionResult.status,
          referencesResolutionStatusChangedAt: new Date(),
          reactionCounts: {},
        })
        .returning()
        .execute();

      if (!insertedComment) {
        throw new Error("Failed to insert comment");
      }

      await moderationResult.saveAndNotify();

      await eventOutboxService.publishEvent({
        event: ponderEventToCommentAddedEvent({
          event,
          context,
          moderationStatus: moderationResult.result.status,
          references: referencesResolutionResult.references,
          comment: insertedComment,
          zeroExSwap,
        }),
        aggregateId: insertedComment.id,
        aggregateType: "comment",
        tx,
      });
    });
  });

  // Handle hook metadata setting separately
  ponder.on("CommentsV1:CommentHookMetadataSet", async ({ event, context }) => {
    await db.transaction(async (tx) => {
      const comment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, event.args.commentId),
      });

      if (!comment) {
        // Ponder should respect the event order, so this should never happen
        Sentry.captureMessage(
          `Comment not found while setting hook metadata for commentId: ${event.args.commentId}`,
          {
            level: "warning",
          },
        );
        return;
      }

      // Add the hook metadata entry to the existing hookMetadata array
      let hookMetadata = comment.hookMetadata || [];
      let hookMetadataOperation: MetadataSetOperation;

      if (event.args.value === "0x") {
        // delete the key from metadata
        hookMetadata = hookMetadata.filter(
          (entry) => entry.key !== event.args.key,
        );

        hookMetadataOperation = {
          type: "delete",
          key: event.args.key,
        };
      } else {
        // update / add the key to metadata
        const metadataEntry = hookMetadata.find(
          (entry) => entry.key === event.args.key,
        );

        if (metadataEntry) {
          metadataEntry.value = event.args.value;

          hookMetadataOperation = {
            type: "update",
            key: event.args.key,
            value: event.args.value,
          };
        } else {
          hookMetadata.push({
            key: event.args.key,
            value: event.args.value,
          });

          hookMetadataOperation = {
            type: "create",
            key: event.args.key,
            value: event.args.value,
          };
        }
      }

      await tx
        .update(schema.comment)
        .set({
          hookMetadata,
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
        })
        .where(eq(schema.comment.id, event.args.commentId))
        .execute();

      await eventOutboxService.publishEvent({
        event: ponderEventToCommentHookMetadataSetEvent({
          event,
          context,
          hookMetadata,
          hookMetadataOperation,
        }),
        aggregateId: event.args.commentId,
        aggregateType: "comment",
        tx,
      });
    });
  });

  ponder.on("CommentsV1:CommentDeleted", async ({ event, context }) => {
    await db.transaction(async (tx) => {
      const existingComment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, event.args.commentId),
      });

      if (!existingComment) {
        return;
      }

      await tx
        .update(schema.comment)
        .set({
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
          deletedAt: new Date(Number(event.block.timestamp) * 1000),
        })
        .where(eq(schema.comment.id, event.args.commentId))
        .execute();

      await eventOutboxService.publishEvent({
        event: ponderEventToCommentDeletedEvent({
          event,
          context,
        }),
        aggregateId: event.args.commentId,
        aggregateType: "comment",
        tx,
      });

      if (
        existingComment.commentType === COMMENT_TYPE_REACTION &&
        existingComment.parentId
      ) {
        const parentComment = await tx.query.comment.findFirst({
          where: eq(schema.comment.id, existingComment.parentId),
        });

        if (!parentComment) {
          return;
        }

        const reactionCounts = parentComment.reactionCounts;

        if (!reactionCounts) {
          return;
        }

        reactionCounts[existingComment.content] =
          (reactionCounts[existingComment.content] ?? 1) - 1;

        await tx
          .update(schema.comment)
          .set({
            reactionCounts,
            updatedAt: new Date(Number(event.block.timestamp) * 1000),
          })
          .where(eq(schema.comment.id, existingComment.parentId))
          .execute();
      }
    });
  });

  ponder.on("CommentsV1:CommentEdited", async ({ event, context }) => {
    // Check if the author is muted
    if (
      await mutedAccountsManagementService.getMutedAccount(event.args.author)
    ) {
      return;
    }

    await db.transaction(async (tx) => {
      const existingComment = await tx.query.comment.findFirst({
        where: eq(schema.comment.id, event.args.commentId),
      });

      if (!existingComment) {
        Sentry.captureMessage(
          `Comment not found while editing commentId: ${event.args.commentId}`,
          {
            level: "warning",
            extra: {
              commentId: event.args.commentId,
              author: event.args.author,
              editedByApp: event.args.editedByApp,
              chainId: context.chain.id,
              txHash: event.transaction.hash,
              logIndex: event.log.logIndex,
            },
          },
        );
        return;
      }

      const updatedAt = new Date(Number(event.args.updatedAt) * 1000);

      const referencesResolutionResult = await resolveCommentReferences(
        {
          chainId: context.chain.id,
          content: event.args.content,
        },
        resolverCommentReferences,
      );

      const newCommentRevision = existingComment.revision + 1;

      const moderationResult = await commentModerationService.moderateUpdate({
        comment: event.args,
        commentRevision: newCommentRevision,
        references: referencesResolutionResult.references,
        existingComment,
      });

      await tx
        .update(schema.comment)
        .set({
          content: event.args.content,
          revision: newCommentRevision,
          updatedAt,
          references: referencesResolutionResult.references,
          referencesResolutionStatus: referencesResolutionResult.status,
          referencesResolutionStatusChangedAt: new Date(),
          moderationStatus: moderationResult.result.status,
          moderationStatusChangedAt: moderationResult.result.changedAt,
          moderationClassifierResult: moderationResult.result.classifier.labels,
          moderationClassifierScore: moderationResult.result.classifier.score,
        })
        .where(eq(schema.comment.id, event.args.commentId))
        .execute();

      await eventOutboxService.publishEvent({
        event: ponderEventToCommentEditedEvent({
          event,
          context,
          references: referencesResolutionResult.references,
          moderationStatus: moderationResult.result.status,
        }),
        aggregateId: event.args.commentId,
        aggregateType: "comment",
        tx,
      });

      await moderationResult.saveAndNotify();
    });
  });
}
