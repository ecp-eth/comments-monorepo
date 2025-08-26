import { type IndexingFunctionArgs } from "ponder:registry";
import {
  type CommentAddedEvent,
  CommentAddedEventSchema,
  type CommentAddedEventInput,
  type CommentHookMetadataSetEvent,
  CommentHookMetadataSetEventSchema,
  type CommentHookMetadataSetEventInput,
  type CommentDeletedEvent,
  CommentDeletedEventSchema,
  type CommentDeletedEventInput,
  type CommentEditedEvent,
  CommentEditedEventSchema,
  type CommentEditedEventInput,
  type CommentModerationStatusUpdatedEvent,
  CommentModerationStatusUpdatedEventSchema,
  type CommentModerationStatusUpdatedEventInput,
} from "./schemas";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { ModerationStatus } from "../../services/types";
import type { CommentSelectType } from "ponder:schema";
import type { MetadataArray, MetadataSetOperation } from "../shared/schemas";

export function ponderEventToCommentAddedEvent({
  event,
  context,
  moderationStatus,
  references,
  comment,
}: IndexingFunctionArgs<"CommentsV1:CommentAdded"> & {
  comment: CommentSelectType;
  moderationStatus: ModerationStatus;
  references: IndexerAPICommentReferencesSchemaType;
}): CommentAddedEvent {
  const uid = `comment:added:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.commentId}`;

  return CommentAddedEventSchema.parse({
    event: "comment:added",
    uid,
    version: 1,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      comment: {
        id: event.args.commentId,
        commentType: event.args.commentType,
        content: event.args.content,
        metadata: event.args.metadata.slice(),
        author: event.args.author,
        app: event.args.app,
        channelId: event.args.channelId,
        createdAt: new Date(Number(event.block.timestamp) * 1000),
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
        moderationStatus,
        references,
        ...(comment.parentId != null
          ? {
              type: "reply",
              parentId: comment.parentId,
            }
          : {
              type: "root",
              targetUri: comment.targetUri,
            }),
      },
    },
  } satisfies CommentAddedEventInput);
}

export function ponderEventToCommentHookMetadataSetEvent({
  event,
  context,
  hookMetadata,
  hookMetadataOperation,
}: IndexingFunctionArgs<"CommentsV1:CommentHookMetadataSet"> & {
  hookMetadata: MetadataArray;
  hookMetadataOperation: MetadataSetOperation;
}): CommentHookMetadataSetEvent {
  const uid = `comment:hook:metadata:set:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.commentId}`;

  return CommentHookMetadataSetEventSchema.parse({
    event: "comment:hook:metadata:set",
    uid,
    version: 1,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      comment: {
        id: event.args.commentId,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
        hookMetadata,
      },
      hookMetadataOperation,
    },
  } satisfies CommentHookMetadataSetEventInput);
}

export function ponderEventToCommentDeletedEvent({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1:CommentDeleted">): CommentDeletedEvent {
  const uid = `comment:deleted:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.commentId}`;

  return CommentDeletedEventSchema.parse({
    event: "comment:deleted",
    uid,
    version: 1,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      comment: {
        id: event.args.commentId,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
        deletedAt: new Date(Number(event.block.timestamp) * 1000),
      },
    },
  } satisfies CommentDeletedEventInput);
}

export function ponderEventToCommentEditedEvent({
  event,
  context,
  references,
  moderationStatus,
}: IndexingFunctionArgs<"CommentsV1:CommentEdited"> & {
  references: IndexerAPICommentReferencesSchemaType;
  moderationStatus: ModerationStatus;
}): CommentEditedEvent {
  const uid = `comment:edited:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.commentId}`;

  return CommentEditedEventSchema.parse({
    event: "comment:edited",
    uid,
    version: 1,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      comment: {
        id: event.args.commentId,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
        content: event.args.content,
        references,
        moderationStatus,
      },
    },
  } satisfies CommentEditedEventInput);
}

export function createCommentModerationStatusUpdatedEvent({
  comment,
}: {
  comment: CommentSelectType;
}): CommentModerationStatusUpdatedEvent {
  const uid = `comment:moderation:status:updated:${comment.chainId}:${comment.moderationStatusChangedAt.getTime()}:${comment.id}`;

  return CommentModerationStatusUpdatedEventSchema.parse({
    event: "comment:moderation:status:updated",
    uid,
    version: 1,
    data: {
      comment: {
        id: comment.id,
        moderationStatus: comment.moderationStatus,
        moderationStatusChangedAt: comment.moderationStatusChangedAt,
      },
    },
  } satisfies CommentModerationStatusUpdatedEventInput);
}
