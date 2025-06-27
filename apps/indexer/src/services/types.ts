import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";

export type ModerationNotificationServicePendingComment = {
  id: Hex;
  channelId: bigint;
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  targetUri: string;
  parentId: Hex;
};

export interface ModerationNotificationsService {
  initialize: () => Promise<void>;
  notifyPendingModeration: (
    comment: ModerationNotificationServicePendingComment,
  ) => Promise<void>;
  updateMessageWithModerationStatus: (
    messageId: number,
    comment: CommentSelectType,
  ) => Promise<void>;
  updateMessageWithChangeAction: (
    messageId: number,
    comment: CommentSelectType,
  ) => Promise<void>;
  decryptWebhookCallbackData: (data: string) => WebhookCallbackData;
}
