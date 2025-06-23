import * as Sentry from "@sentry/node";
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
import { type Hex } from "@ecp.eth/sdk/core/schemas";
import { zeroExSwapResolver } from "../lib/0x-swap-resolver";
import {
  resolveCommentReferences,
  type ResolveCommentReferencesOptions,
} from "../lib/resolve-comment-references";
import { ensByAddressResolver } from "../resolvers/ens-by-address-resolver";
import { ensByNameResolver } from "../resolvers/ens-by-name-resolver";
import { erc20ByAddressResolver } from "../resolvers/erc20-by-address-resolver";
import { erc20ByTickerResolver } from "../resolvers/erc20-by-ticker-resolver";
import { farcasterByAddressResolver } from "../resolvers/farcaster-by-address-resolver";
import { farcasterByNameResolver } from "../resolvers/farcaster-by-name-resolver";
import { urlResolver } from "../resolvers/url-resolver";
import { moderationNotificationsService } from "../services";

const defaultModerationStatus = env.MODERATION_ENABLED ? "pending" : "approved";

const resolverCommentReferences: ResolveCommentReferencesOptions = {
  ensByAddressResolver,
  ensByNameResolver,
  erc20ByAddressResolver,
  erc20ByTickerResolver,
  farcasterByAddressResolver,
  farcasterByNameResolver,
  urlResolver,
};

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

      // if parent comment doesn't have a root comment id then it is a root comment itself
      rootCommentId = parentComment.rootCommentId ?? parentComment.id;
    }

    // We need to check if the comment already has a moderation status
    // this is useful during the reindex process
    const moderationStatus = await getCommentModerationStatus(
      event.args.commentId,
    );

    const referencesResolutionResult = await resolveCommentReferences(
      {
        chainId: context.chain.id,
        content: event.args.content,
      },
      resolverCommentReferences,
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
      chainId: context.chain.id,
      app: event.args.app,
      logIndex: event.log.logIndex,
      channelId: event.args.channelId,
      commentType: event.args.commentType,
      ...(moderationStatus
        ? {
            moderationStatus: moderationStatus.status,
            moderationStatusChangedAt: moderationStatus.changedAt,
          }
        : {
            moderationStatus: defaultModerationStatus,
            moderationStatusChangedAt: createdAt,
          }),
      zeroExSwap,
      references: referencesResolutionResult.references,
      referencesResolutionStatus: referencesResolutionResult.status,
      referencesResolutionStatusChangedAt: new Date(),
    });

    // this is new comment so ensure we use correct default moderation status
    if (!moderationStatus) {
      await insertCommentModerationStatus(
        event.args.commentId,
        defaultModerationStatus,
      );

      await moderationNotificationsService.notifyPendingModeration({
        id: event.args.commentId,
        author: event.args.author,
        content: event.args.content,
        targetUri,
      });
    }
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
    // Check if the author is muted
    if (await getMutedAccount(event.args.author)) {
      return;
    }

    const existingComment = await context.db.find(schema.comment, {
      id: event.args.commentId,
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

    await context.db
      .update(schema.comment, {
        id: event.args.commentId,
      })
      .set({
        content: event.args.content,
        revision: existingComment.revision + 1,
        updatedAt,
        references: referencesResolutionResult.references,
        referencesResolutionStatus: referencesResolutionResult.status,
        referencesResolutionStatusChangedAt: new Date(),
      });
  });
}
