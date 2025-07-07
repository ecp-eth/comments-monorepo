import { env } from "../env";
import { CommentModerationClassifier } from "./mbd-comment-moderation-classifier";
import { ModerationNotificationsService } from "./moderation-notifications";
import { NoopNotificationsService } from "./noop-notifications";

export const moderationNotificationsService =
  env.MODERATION_TELEGRAM_BOT_TOKEN &&
  env.MODERATION_TELEGRAM_CHANNEL_ID &&
  env.MODERATION_TELEGRAM_WEBHOOK_URL &&
  env.MODERATION_TELEGRAM_WEBHOOK_SECRET
    ? new ModerationNotificationsService({
        telegramBotToken: env.MODERATION_TELEGRAM_BOT_TOKEN,
        telegramChannelId: env.MODERATION_TELEGRAM_CHANNEL_ID,
        telegramWebhookUrl: env.MODERATION_TELEGRAM_WEBHOOK_URL,
        telegramWebhookSecret: env.MODERATION_TELEGRAM_WEBHOOK_SECRET,
      })
    : new NoopNotificationsService();

export const commentModerationClassifierService =
  new CommentModerationClassifier({
    apiKey: env.MBD_API_KEY,
  });
