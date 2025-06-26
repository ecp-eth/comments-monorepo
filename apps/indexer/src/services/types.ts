import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";

export type ModerationNotificationServicePendingComment = {
  id: Hex;
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  targetUri: string;
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
  decryptWebhookCallbackData: (data: string) => WebhookCallbackData;
}
