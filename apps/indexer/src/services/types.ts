import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";

export type ModerationStatus = "pending" | "approved" | "rejected";

export type ModerationNotificationServicePendingComment = {
  id: Hex;
  channelId: bigint;
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  targetUri: string;
  parentId: Hex;
};

export type ModerationNotificationServiceNotifyPendingModerationParams = {
  comment: ModerationNotificationServicePendingComment;
  classifierResult: CommentModerationClassfierResult;
};

export type ModerationNotificationServiceNotifyAutomaticClassificationParams = {
  /**
   * The message ID of the message to reply to.
   * This is optional, if not provided, a new message will be sent otherwise we will reply to this message
   */
  messageId?: number;
  comment: ModerationNotificationServicePendingComment;
  classifierResult: CommentModerationClassfierResult;
};

export type ModerationNotificationsServiceCommentStatus = "create" | "update";

export interface IModerationNotificationsService {
  initialize: () => Promise<void>;
  /**
   * Notify Telegram that a comment is pending moderation.
   * @param params - The parameters for the notification.
   * @returns The message ID if the message was sent, undefined if the message has not been sent because the message length limit was exceeded.
   */
  notifyPendingModeration: (
    params: ModerationNotificationServiceNotifyPendingModerationParams,
    status: ModerationNotificationsServiceCommentStatus,
  ) => Promise<number | undefined>;
  /**
   * Notify Telegram that a comment was automatically classified.
   * @param params - The parameters for the notification.
   * @returns The message ID if the message was sent, undefined if the message has not been sent because the message length limit was exceeded.
   */
  notifyAutomaticClassification: (
    params: ModerationNotificationServiceNotifyAutomaticClassificationParams,
    status: ModerationNotificationsServiceCommentStatus,
  ) => Promise<number | undefined>;
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
  action: "skipped" | "classified";
  /**
   * The highest score of the moderation labels.
   */
  score: number;
  labels: CommentModerationLabelsWithScore;
  save(): Promise<void>;
};

export interface ICommentModerationClassifierService {
  classify: (
    comment: ModerationNotificationServicePendingComment,
  ) => Promise<CommentModerationClassfierResult>;
  classifyUpdate: (
    comment: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ) => Promise<CommentModerationClassfierResult>;
}

export type CommentClassifierCacheServiceResult = {
  labels: CommentModerationLabelsWithScore;
  score: number;
};

export interface ICommentClassifierCacheService {
  getByCommentId(
    commentId: Hex,
  ): Promise<CommentClassifierCacheServiceResult | undefined>;
  setByCommentId(
    commentId: Hex,
    result: CommentClassifierCacheServiceResult,
  ): Promise<void>;
}

export type CommentPremoderationServiceModerateResult = {
  action: "skipped" | "premoderated";
  status: ModerationStatus;
  changedAt: Date;
  save(): Promise<void>;
};

export type CommentPremoderationServiceModerateParams =
  ModerationNotificationServiceNotifyPendingModerationParams;

export interface ICommentPremoderationService {
  moderate: (
    comment: ModerationNotificationServicePendingComment,
  ) => Promise<CommentPremoderationServiceModerateResult>;

  moderateUpdate: (
    comment: ModerationNotificationServicePendingComment,
    existingComment: CommentSelectType,
  ) => Promise<CommentPremoderationServiceModerateResult>;

  updateStatus: (
    commentId: Hex,
    status: ModerationStatus,
  ) => Promise<CommentSelectType | undefined>;
}

export type PremoderationCacheServiceStatus = {
  status: ModerationStatus;
  changedAt: Date;
};

export interface IPremoderationCacheService {
  getStatusByCommentId(
    commentId: Hex,
  ): Promise<PremoderationCacheServiceStatus | undefined>;
  setStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void>;
}

export interface ICommentDbService {
  getCommentById(commentId: Hex): Promise<CommentSelectType | undefined>;
  updateCommentModerationStatus: (
    commentId: Hex,
    status: ModerationStatus,
  ) => Promise<CommentSelectType | undefined>;
}
