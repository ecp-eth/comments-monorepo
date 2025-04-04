import { ponder as Ponder } from "ponder:registry";
import {
  transformCommentParentId,
  transformCommentTargetUri,
} from "../lib/utils";
import { getMutedAccount } from "../management/services/muted-accounts";
import schema from "ponder:schema";
import { env } from "../env";
import { getAddress } from "viem";
import {
  getCommentModerationStatus,
  insertCommentModerationStatus,
} from "../management/services/moderation";
import { notifyCommentPendingModeration } from "../lib/telegram-notifications";
import { getRootCommentId } from "../lib/replies";
import { Hex } from "@ecp.eth/sdk/types";
// import { isProfane } from "../lib/profanity-detection";

const defaultModerationStatus = env.MODERATION_ENABLED ? "pending" : "approved";

export function initializeCommentEventsIndexing(ponder: typeof Ponder) {
  ponder.on("CommentsV1:CommentAdded", async ({ event, context }) => {
    const targetUri = transformCommentTargetUri(
      event.args.commentData.targetUri
    );

    // uncomment to enable basic profanity detection
    /* 
    if (isProfane(event.args.commentData.content)) {
      return;
    }*/

    if (await getMutedAccount(event.args.commentData.author)) {
      return;
    }

    const timestamp = new Date(Number(event.block.timestamp) * 1000);

    // We need to check if the comment already has a moderation status
    // this is useful during the reindex process
    const moderationStatus = await getCommentModerationStatus(
      event.args.commentId
    );

    const parentId = transformCommentParentId(event.args.commentData.parentId);
    let rootCommentId: Hex | null = null;

    if (parentId) {
      rootCommentId =
        (await getRootCommentId(parentId, context.db.sql)) ?? null;
    }

    await context.db.insert(schema.comment).values({
      id: event.args.commentId,
      content: event.args.commentData.content,
      metadata: event.args.commentData.metadata,
      targetUri,
      parentId,
      rootCommentId,
      author: event.args.commentData.author,
      txHash: event.transaction.hash,
      timestamp,
      chainId: context.network.chainId,
      appSigner: event.args.commentData.appSigner,
      logIndex: event.log.logIndex,
      ...(moderationStatus
        ? {
            moderationStatus: moderationStatus.status,
            moderationStatusChangedAt: moderationStatus.changedAt,
          }
        : {
            moderationStatus: defaultModerationStatus,
            moderationStatusChangedAt: timestamp,
          }),
    });

    // this is new comment so ensure we use correct default moderation status
    if (!moderationStatus) {
      await insertCommentModerationStatus(
        event.args.commentId,
        defaultModerationStatus
      );

      await notifyCommentPendingModeration({
        id: event.args.commentId,
        authorAddress: event.args.commentData.author,
        content: event.args.commentData.content,
        targetUri,
      });
    }
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
}
