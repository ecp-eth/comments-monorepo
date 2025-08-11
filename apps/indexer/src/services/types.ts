import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { Convenience, Message } from "telegraf/types";
import type { CommentReportStatus } from "../management/types";
import type { Handler } from "hono";
import type { CommentReportSelectType } from "../../schema.offchain";

export type ModerationStatus = "pending" | "approved" | "rejected";

export type ResolveAuthorFunction = (author: Hex) => Promise<string | Hex>;

export type ModerationNotificationServicePendingComment = {
  id: Hex;
  channelId: bigint;
  author: Hex;
  content: string;
  references: IndexerAPICommentReferencesSchemaType;
  targetUri: string;
  parentId: Hex;
  revision: number;
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
  notifyAutomaticallyClassified: (
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
}

export type ReportsNotificationsServiceNotifyReportParams = {
  comment: CommentSelectType;
  report: CommentReportSelectType;
};

export type ReportsNotificationsServiceNotifyReportStatusChangeParams = {
  messageId: number;
  comment: CommentSelectType;
  report: CommentReportSelectType;
};

export interface IReportsNotificationsService {
  notifyReportCreated: (
    params: ReportsNotificationsServiceNotifyReportParams,
  ) => Promise<number | undefined>;
  notifyReportStatusChanged: (
    params: ReportsNotificationsServiceNotifyReportStatusChangeParams,
  ) => Promise<void>;
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
    commentRevision: number,
  ): Promise<CommentClassifierCacheServiceResult | undefined>;
  setByCommentId(params: {
    commentId: Hex;
    commentRevision: number;
    result: CommentClassifierCacheServiceResult;
  }): Promise<void>;
  deleteByCommentId(commentId: Hex, commentRevision: number): Promise<void>;
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

  updateStatus: (params: {
    commentId: Hex;
    /**
     * If omitted it will update the latest revision and all older pending revisions.
     */
    commentRevision: number | undefined;
    status: ModerationStatus;
  }) => Promise<CommentSelectType | undefined>;
}

export type PremoderationCacheServiceStatus = {
  status: ModerationStatus;
  changedAt: Date;
  revision: number;
};

export interface IPremoderationCacheService {
  getStatusByCommentId(
    commentId: Hex,
    commentRevision: number,
  ): Promise<PremoderationCacheServiceStatus | undefined>;
  getLatestStatusByCommentId(
    commentId: Hex,
  ): Promise<PremoderationCacheServiceStatus | undefined>;
  insertStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void>;
  setStatusByCommentId(
    commentId: Hex,
    status: PremoderationCacheServiceStatus,
  ): Promise<void>;
}

export interface ICommentDbService {
  getCommentPendingModeration: () => Promise<CommentSelectType | undefined>;
  getCommentById(commentId: Hex): Promise<CommentSelectType | undefined>;
  updateCommentModerationStatus: (params: {
    commentId: Hex;
    /**
     * If omitted it will update the latest revision and all older pending revisions.
     */
    commentRevision: number | undefined;
    status: ModerationStatus;
  }) => Promise<CommentSelectType | undefined>;
}

export interface ICommentReportsService {
  /**
   * Report a comment with a message
   * @param commentId The ID of the comment to report
   * @param reportee The address of the user reporting the comment
   * @param message Optional message explaining the report (max 200 chars)
   */
  report(commentId: Hex, reportee: Hex, message?: string): Promise<void>;
  /**
   * Change the status of a report
   * @param messageId The message ID of the report
   * @param reportId The ID of the report to change the status of
   * @param status The new status of the report
   */
  changeStatus(
    messageId: number,
    reportId: string,
    status: CommentReportStatus,
  ): Promise<void>;
  /**
   * Request a status change for a report
   * @param messageId The message ID of the report
   * @param reportId The ID of the report to request a status change for
   */
  requestStatusChange(messageId: number, reportId: string): Promise<void>;
  /**
   * Cancel a status change request for a report
   * @param messageId The message ID of the report
   * @param reportId The ID of the report to cancel the status change for
   */
  cancelStatusChange(messageId: number, reportId: string): Promise<void>;
}

export interface ITelegramNotificationsService {
  initialize: () => Promise<void>;
  encryptWebhookCallbackData: (data: WebhookCallbackData) => string;
  decryptWebhookCallbackData: (data: string) => WebhookCallbackData;
  sendMessage: (
    message: string,
    extra?: Convenience.ExtraReplyMessage,
  ) => Promise<Message.TextMessage | undefined>;
  /**
   * Send a message with webhook actions.
   * @param message The message to send.
   * @param actions The actions to add to the message.
   * @param extra Extra options to pass to the message.
   * @returns The message object if the message was sent, undefined if the message has not been sent because the notification service is disabled.
   */
  sendMessageWithWebhookActions: (
    message: string,
    actions: {
      action: WebhookCallbackData;
      text: string;
    }[],
    extra?: Omit<Convenience.ExtraReplyMessage, "reply_markup">,
  ) => Promise<Message.TextMessage | undefined>;
  updateMessageWithWebhookActions: (
    messageId: number,
    message: string,
    actions: {
      action: WebhookCallbackData;
      text: string;
    }[],
    extra?: Omit<Convenience.ExtraEditMessageText, "inline_keyboard">,
  ) => Promise<void>;
}

export interface IAdminTelegramBotService {
  initialize: () => Promise<void>;
  handleWebhookRequest: Handler;
}
