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
    classifierResult: CommentModerationClassfierResult,
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

export enum CommentModerationLabel {
  LLM_GENERATED = "llm_generated",
  SPAM = "spam",
  SEXUAL = "sexual",
  HATE = "hate",
  VIOLENCE = "violence",
  HARASSMENT = "harassment",
  SELF_HARM = "self_harm",
  SEXUAL_MINORS = "sexual_minors",
  HATE_THREATENING = "hate_threatening",
  VIOLENCE_GRAPHIC = "violence_graphic",
}

export type CommentModerationLabelWithScore = {
  label: CommentModerationLabel | string;
  score: number;
};

export type CommentModerationClassfierResult = {
  /**
   * The highest score of the moderation labels.
   */
  score: number;
  labels: CommentModerationLabelWithScore[];
};

export interface CommentModerationClassifierService {
  classify: (content: string) => Promise<CommentModerationClassfierResult>;
}
