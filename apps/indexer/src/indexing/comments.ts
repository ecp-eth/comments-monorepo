import * as Sentry from "@sentry/node";
import { ponder as Ponder } from "ponder:registry";
import {
  transformCommentParentId,
  transformCommentTargetUri,
} from "../lib/utils";
import { getMutedAccount } from "../management/services/muted-accounts";
import schema from "ponder:schema";
import { getAddress } from "viem";
import { commentModerationService } from "../services";
import { type Hex } from "@ecp.eth/sdk/core/schemas";
import { zeroExSwapResolver } from "../lib/0x-swap-resolver";
import {
  resolveCommentReferences,
  type ResolveCommentReferencesOptions,
} from "../lib/resolve-comment-references";
import { ensByAddressResolverService } from "../services/ens-by-address-resolver";
import { ensByNameResolverService } from "../services/ens-by-name-resolver";
import { erc20ByAddressResolverService } from "../services/erc20-by-address-resolver";
import { erc20ByTickerResolverService } from "../services/erc20-by-ticker-resolver";
import { farcasterByAddressResolverService } from "../services/farcaster-by-address-resolver";
import { farcasterByNameResolverService } from "../services/farcaster-by-name-resolver";
import { urlResolverService } from "../services/url-resolver";

import { COMMENT_TYPE_REACTION } from "@ecp.eth/sdk";
import { env } from "../env";

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

      if (event.args.commentType === COMMENT_TYPE_REACTION) {
        const reactionType = event.args.content;

        await context.db
          .update(schema.comment, {
            id: parentId,
          })
          .set({
            reactionCounts: {
              ...parentComment.reactionCounts,
              [reactionType]:
                (parentComment.reactionCounts?.[reactionType] ?? 0) + 1,
            },
          });
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
      moderationStatus: moderationResult.result.status,
      moderationStatusChangedAt: moderationResult.result.changedAt,
      moderationClassifierResult: moderationResult.result.classifier.labels,
      moderationClassifierScore: moderationResult.result.classifier.score,
      zeroExSwap,
      references: referencesResolutionResult.references,
      referencesResolutionStatus: referencesResolutionResult.status,
      referencesResolutionStatusChangedAt: new Date(),
      reactionCounts: {},
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

    if (!existingComment) {
      return;
    }

    if (getAddress(existingComment.author) === getAddress(event.args.author)) {
      await context.db
        .update(schema.comment, {
          id: event.args.commentId,
        })
        .set({
          deletedAt: new Date(Number(event.block.timestamp) * 1000),
        });
    }

    if (
      existingComment.commentType === COMMENT_TYPE_REACTION &&
      existingComment.parentId
    ) {
      const parentComment = await context.db.find(schema.comment, {
        id: existingComment.parentId,
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

      await context.db
        .update(schema.comment, {
          id: existingComment.parentId,
        })
        .set({
          reactionCounts,
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

    const newCommentRevision = existingComment.revision + 1;

    const moderationResult = await commentModerationService.moderateUpdate({
      comment: event.args,
      commentRevision: newCommentRevision,
      references: referencesResolutionResult.references,
      existingComment,
    });

    await context.db
      .update(schema.comment, {
        id: event.args.commentId,
      })
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
      });

    await moderationResult.saveAndNotify();
  });
}
