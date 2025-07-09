import { env } from "../env";
import { CommentModerationClassifier } from "./mbd-comment-moderation-classifier";
import { ModerationNotificationsService } from "./moderation-notifications";
import { NoopNotificationsService } from "./noop-notifications";
import { NoopCommentModerationClassifier } from "./noop-comment-moderation-classifier";
import { PremoderationService } from "./premoderation-service";
import { PremoderationCacheService } from "./premoderation-cache-service";
import { NoopPremoderationService } from "./noop-premoderation-service";
import { CommentDbService } from "./comment-db-service";
import { ClassificationCacheService } from "./classification-cache-service";

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

const classifierCacheService = new ClassificationCacheService();

export const commentModerationClassifierService =
  env.MODERATION_ENABLE_AUTOMATIC_CLASSIFICATION && env.MODERATION_MBD_API_KEY
    ? new CommentModerationClassifier({
        apiKey: env.MODERATION_MBD_API_KEY,
        cacheService: classifierCacheService,
      })
    : new NoopCommentModerationClassifier();

const premoderationCacheService = new PremoderationCacheService();

export const commentDbService = new CommentDbService({
  cacheService: premoderationCacheService,
});

export const premoderationService = env.MODERATION_ENABLED
  ? new PremoderationService({
      defaultModerationStatus: "pending",
      cacheService: premoderationCacheService,
      dbService: commentDbService,
    })
  : new NoopPremoderationService();
