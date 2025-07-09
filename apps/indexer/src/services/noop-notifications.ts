import type { WebhookCallbackData } from "../utils/webhook";
import type { IModerationNotificationsService } from "./types";
import type { CommentSelectType } from "ponder:schema";

export class NoopNotificationsService
  implements IModerationNotificationsService
{
  async initialize() {
    console.log("NoopNotificationsService: initialize");
  }

  async notifyPendingModeration() {
    console.log("NoopNotificationsService: notifyPendingModeration");
    return undefined;
  }

  async notifyAutomaticClassification() {
    console.log("NoopNotificationsService: notifyAutomaticClassification");
    return undefined;
  }

  async updateMessageWithModerationStatus(
    messageId: number,
    comment: CommentSelectType,
  ) {
    console.log("NoopNotificationsService: updateMessageWithModerationStatus", {
      messageId,
      comment,
    });
  }

  async updateMessageWithChangeAction(
    messageId: number,
    comment: CommentSelectType,
  ) {
    console.log("NoopNotificationsService: updateMessageWithChangeAction", {
      messageId,
      comment,
    });
  }

  decryptWebhookCallbackData(data: string): WebhookCallbackData {
    console.log("NoopNotificationsService: decryptWebhookCallbackData", data);
    throw new Error("Not implemented");
  }
}
