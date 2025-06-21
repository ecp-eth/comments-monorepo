import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import { CommentSelectType } from "ponder:schema";

export type ModerationNotificationServicePendingComment = {
  id: Hex;
  author: Hex;
  content: string;
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
