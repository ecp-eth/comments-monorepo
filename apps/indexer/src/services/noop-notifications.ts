import type { WebhookCallbackData } from "../utils/webhook";
import type { ModerationNotificationsService } from "./types";
import type { CommentSelectType } from "ponder:schema";

export class NoopNotificationsService
  implements ModerationNotificationsService
{
  async initialize() {
    console.log("NoopNotificationsService: initialize");
  }

  async notifyPendingModeration() {
    console.log("NoopNotificationsService: notifyPendingModeration");
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
