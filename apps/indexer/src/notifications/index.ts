import type { Hex } from "@ecp.eth/sdk/core";
import {
  NotificationMentionSchema,
  type NotificationMentionSchemaInput,
  type NotificationMentionSchemaType,
  NotificationReactionSchema,
  type NotificationReactionSchemaInput,
  type NotificationReactionSchemaType,
  type NotificationQuoteSchemaType,
  type NotificationQuoteSchemaInput,
  NotificationReplySchema,
  type NotificationReplySchemaInput,
  type NotificationReplySchemaType,
  NotificationQuoteSchema,
} from "./schemas";

type CreateReplyNotificationParams = {
  chainId: number;
  reply: {
    id: Hex;
    author: Hex;
    app: Hex;
  };
  /**
   * The chain of parent comments
   */
  parents: {
    id: Hex;
    author: Hex;
  }[];
};

export function createReplyNotifications({
  chainId,
  reply,
  parents,
}: CreateReplyNotificationParams): NotificationReplySchemaType[] {
  return parents.map((parent) => {
    return NotificationReplySchema.parse({
      uid: `reply:${chainId}:${parent.id}:${reply.id}`,
      type: "reply",
      recipientAddress: parent.author,
      appSigner: reply.app,
      authorAddress: reply.author,
      parentId: parent.id,
      entityId: reply.id,
    } satisfies NotificationReplySchemaInput);
  });
}

type CreateMentionNotificationParams = {
  chainId: number;
  comment: {
    id: Hex;
    author: Hex;
    app: Hex;
  };
  mentionedUser: {
    address: Hex;
  };
};

export function createMentionNotification({
  chainId,
  comment,
  mentionedUser,
}: CreateMentionNotificationParams): NotificationMentionSchemaType {
  return NotificationMentionSchema.parse({
    uid: `mention:${chainId}:${comment.id}:${mentionedUser.address}`,
    type: "mention",
    recipientAddress: mentionedUser.address,
    appSigner: comment.app,
    authorAddress: comment.author,
    parentId: comment.id,
    entityId: comment.id,
  } satisfies NotificationMentionSchemaInput);
}

type CreateReactionNotificationParams = {
  chainId: number;
  reaction: {
    id: Hex;
    author: Hex;
    app: Hex;
  };
  parent: {
    id: Hex;
    author: Hex;
  };
};

export function createReactionNotification({
  chainId,
  reaction,
  parent,
}: CreateReactionNotificationParams): NotificationReactionSchemaType {
  return NotificationReactionSchema.parse({
    uid: `reaction:${chainId}:${parent.id}:${reaction.id}`,
    type: "reaction",
    appSigner: reaction.app,
    authorAddress: reaction.author,
    recipientAddress: parent.author,
    parentId: parent.id,
    entityId: reaction.id,
  } satisfies NotificationReactionSchemaInput);
}

type CreateQuoteNotificationParams = {
  chainId: number;
  quotedComment: {
    id: Hex;
    author: Hex;
    app: Hex;
  };
  comment: {
    id: Hex;
    author: Hex;
    app: Hex;
  };
};

export function createQuoteNotification({
  chainId,
  quotedComment,
  comment,
}: CreateQuoteNotificationParams): NotificationQuoteSchemaType {
  return NotificationQuoteSchema.parse({
    uid: `quote:${chainId}:${quotedComment.id}:${comment.id}`,
    type: "quote",
    appSigner: quotedComment.app,
    authorAddress: quotedComment.author,
    recipientAddress: comment.author,
    parentId: comment.id,
    entityId: quotedComment.id,
  } satisfies NotificationQuoteSchemaInput);
}
