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
  HARASSMENT = "harassment",
  HATE = "hate",
  HATE_THREATENING = "hate_threatening",
  LLM_GENERATED = "llm_generated",
  SELF_HARM = "self_harm",
  SEXUAL = "sexual",
  SEXUAL_MINORS = "sexual_minors",
  SPAM = "spam",
  VIOLENCE = "violence",
  VIOLENCE_GRAPHIC = "violence_graphic",
}

export type CommentModerationLabelsWithScore = Record<string, number>;

export type CommentModerationClassfierResult = {
  /**
   * The highest score of the moderation labels.
   */
  score: number;
  labels: CommentModerationLabelsWithScore;
};

export interface CommentModerationClassifierService {
  classify: (content: string) => Promise<CommentModerationClassfierResult>;
}
