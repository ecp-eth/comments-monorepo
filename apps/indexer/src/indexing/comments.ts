import * as Sentry from "@sentry/node";
import { ponder as Ponder } from "ponder:registry";
import {
  transformCommentParentId,
  transformCommentTargetUri,
} from "../lib/utils";
import { getMutedAccount } from "../management/services/muted-accounts";
import schema from "ponder:schema";
import { getAddress } from "viem";
import { commentModerationService } from "../management/services";
import { type Hex } from "@ecp.eth/sdk/core/schemas";
import { zeroExSwapResolver } from "../lib/0x-swap-resolver";

export function initializeCommentEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
    const targetUri = transformCommentTargetUri(event.args.targetUri);

    if (await getMutedAccount(event.args.author)) {
      return;
    }

    const zeroExSwap = await zeroExSwapResolver.resolveFromCommentAddedEvent({
      event,
      context,
    });

    const createdAt = new Date(Number(event.args.createdAt) * 1000);
    const updatedAt = new Date(Number(event.args.createdAt) * 1000);

    const parentId = transformCommentParentId(event.args.parentId);
    let rootCommentId: Hex | null = null;

    if (parentId) {
      const parentComment = await context.db.find(schema.comment, {
        id: parentId,
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
              chainId: context.network.chainId,
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

      // if parent comment doesn't have a root comment id then it is a root comment itself
      rootCommentId = parentComment.rootCommentId ?? parentComment.id;
    }

    // We need to check if the comment already has a moderation status
    // this is useful during the reindex process
    const moderationResult = await commentModerationService.moderate(
      event.args,
    );

    await context.db.insert(schema.comment).values({
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
      chainId: context.network.chainId,
      app: event.args.app,
      logIndex: event.log.logIndex,
      channelId: event.args.channelId,
      commentType: event.args.commentType,
      moderationStatus: moderationResult.result.status,
      moderationStatusChangedAt: moderationResult.result.changedAt,
      zeroExSwap,
    });

    await moderationResult.saveAndNotify();
  });

  // Handle hook metadata setting separately
  ponder.on("CommentsV1:CommentHookMetadataSet", async ({ event, context }) => {
    const comment = await context.db.find(schema.comment, {
      id: event.args.commentId,
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
    const existingHookMetadata = comment.hookMetadata ?? [];
    const newHookMetadataEntry = {
      key: event.args.key,
      value: event.args.value,
    };

    // Check if this key already exists and update it, otherwise add new entry
    const existingIndex = existingHookMetadata.findIndex(
      (entry) => entry.key === event.args.key,
    );
    if (existingIndex !== -1) {
      existingHookMetadata[existingIndex] = newHookMetadataEntry;
    } else {
      existingHookMetadata.push(newHookMetadataEntry);
    }

    await context.db
      .update(schema.comment, {
        id: event.args.commentId,
      })
      .set({
        hookMetadata: existingHookMetadata,
      });
  });

  ponder.on("CommentsV1:CommentDeleted", async ({ event, context }) => {
    const existingComment = await context.db.find(schema.comment, {
      id: event.args.commentId,
    });

    if (
      existingComment &&
      getAddress(existingComment.author) === getAddress(event.args.author)
    ) {
      await context.db
        .update(schema.comment, {
          id: event.args.commentId,
        })
        .set({
          deletedAt: new Date(Number(event.block.timestamp) * 1000),
        });
    }
  });

  ponder.on("CommentsV1:CommentEdited", async ({ event, context }) => {
    const existingComment = await context.db.find(schema.comment, {
      id: event.args.commentId,
    });

    if (!existingComment) {
      return;
    }

    const updatedAt = new Date(Number(event.args.updatedAt) * 1000);

    await context.db
      .update(schema.comment, {
        id: event.args.commentId,
      })
      .set({
        content: event.args.content,
        revision: existingComment.revision + 1,
        updatedAt,
      });
  });
}
