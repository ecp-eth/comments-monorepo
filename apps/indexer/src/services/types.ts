import type { Hex } from "@ecp.eth/sdk/core";
import type { WebhookCallbackData } from "../utils/webhook";
import type { CommentSelectType } from "ponder:schema";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type { Convenience, Message } from "telegraf/types";
import type { CommentReportStatus } from "../management/types";
import type { Handler } from "hono";
import type {
  CommentModerationStatusesSelectType,
  CommentReportSelectType,
} from "../../schema.offchain";
import { ServiceError } from "./errors";

export type ModerationStatus = "pending" | "approved" | "rejected";

export type ResolveAuthorFunction = (author: Hex) => Promise<string | Hex>;

export type TelegramCallbackQuery = {
  id: string;
  data: string;
  message: {
    message_id: number;
  };
};

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
  updateMessageWithModerationStatus: (params: {
    messageId: number;
    comment: CommentSelectType;
    /**
     * If set the service will answer the calback query
     */
    callbackQuery?: TelegramCallbackQuery;
  }) => Promise<void>;
  updateMessageWithChangeAction: (params: {
    messageId: number;
    comment: CommentSelectType;
    /**
     * If set the service will answer the calback query
     */
    callbackQuery?: TelegramCallbackQuery;
  }) => Promise<void>;
}

export type ReportsNotificationsServiceNotifyReportParams = {
  comment: CommentSelectType;
  report: CommentReportSelectType;
};

export type ReportsNotificationsServiceNotifyReportStatusChangeParams = {
  messageId: number;
  comment: CommentSelectType;
  report: CommentReportSelectType;
  callbackQuery: TelegramCallbackQuery;
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

  getCommentById: (commentId: Hex) => Promise<CommentSelectType | undefined>;

  getPendingComment: () => Promise<CommentSelectType | undefined>;

  getStatusByCommentId: (
    commentId: Hex,
    commentRevision: number,
  ) => Promise<CommentModerationStatusesSelectType | undefined>;

  getLatestStatusByCommentId: (
    commentId: Hex,
  ) => Promise<CommentModerationStatusesSelectType | undefined>;
}

export interface ICommentReportsService {
  /**
   * Report a comment with a message
   */
  report(params: {
    /**
     * The ID of the comment to report
     */
    commentId: Hex;
    /**
     * The address of the user reporting the comment
     */
    reportee: Hex;
    /**
     * Optional message explaining the report (max 200 chars)
     */
    message: string | undefined;
  }): Promise<void>;

  /**
   * Change the status of a report
   */
  changeStatus(params: {
    /**
     * The ID of the report to change the status of
     */
    reportId: string;
    /**
     * The new status of the report
     */
    status: CommentReportStatus;
    /**
     * The telegram callback query to reply to
     */
    callbackQuery: TelegramCallbackQuery | undefined;
  }): Promise<CommentReportSelectType>;

  /**
   * Request a status change for a report
   * @param reportId The ID of the report to request a status change for
   * @param callbackQuery The telegram callback query to reply to
   */
  requestStatusChange(
    reportId: string,
    callbackQuery?: TelegramCallbackQuery,
  ): Promise<CommentReportSelectType>;
  /**
   * Cancel a status change request for a report
   * @param reportId The ID of the report to cancel the status change for
   * @param callbackQuery The telegram callback query to reply to
   */
  cancelStatusChange(
    reportId: string,
    callbackQuery?: TelegramCallbackQuery,
  ): Promise<CommentReportSelectType>;

  /**
   * Get a report by ID
   * @param reportId The ID of the report to get
   * @returns The report if it exists, undefined otherwise
   */
  getReportById(reportId: string): Promise<CommentReportSelectType | undefined>;

  /**
   * Get a pending report
   * This method retrieves the most recent pending report from the database.
   * @returns A pending report if it exists, undefined otherwise
   */
  getPendingReport(): Promise<CommentReportSelectType | undefined>;
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
  answerCallbackQueryWithSuccess: (
    callbackQueryId: string,
    text: string,
  ) => Promise<void>;
  answerCallbackQueryWithError: (
    callbackQueryId: string,
    text: string,
  ) => Promise<void>;
}

export interface IAdminTelegramBotService {
  initialize: () => Promise<void>;
  handleWebhookRequest: Handler;
}
