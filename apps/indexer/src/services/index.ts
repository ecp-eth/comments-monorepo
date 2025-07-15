import { env } from "../env";
import { CommentModerationClassifier } from "./mbd-comment-moderation-classifier";
import { ModerationNotificationsService } from "./moderation-notifications-service";
import { NoopCommentModerationClassifier } from "./noop-comment-moderation-classifier";
import { PremoderationService } from "./premoderation-service";
import { PremoderationCacheService } from "./premoderation-cache-service";
import { NoopPremoderationService } from "./noop-premoderation-service";
import { CommentDbService } from "./comment-db-service";
import { ClassificationCacheService } from "./classification-cache-service";
import { CommentReportsService } from "./comment-reports-service";
import { ManagementCommentDbService } from "../management/services/comment-db-service";
import { CommentModerationService } from "../management/services/comment-moderation-service";
import { Hex } from "@ecp.eth/sdk/core";
import { ensByAddressResolverService } from "./ens-by-address-resolver";
import { farcasterByAddressResolverService } from "./farcaster-by-address-resolver";
import { ReportsNotificationsService } from "./reports-notifications-service";
import { TelegramNotificationsService } from "./telegram-notifications-service";
import { NoopAdminBotService } from "./admin-noop-bot-service";
import { AdminTelegramBotService } from "./admin-telegram-bot-service";
import { StartCommand } from "./admin-telegram-bot-service/commands/start";
import { ReportCommand } from "./admin-telegram-bot-service/commands/report";
import { ReportPendingCommand } from "./admin-telegram-bot-service/commands/report-pending";

function resolveAuthor(author: Hex): Promise<string | Hex> {
  return ensByAddressResolverService.load(author).then((data) => {
    if (data) {
      return data.name;
    }

    return farcasterByAddressResolverService
      .load(author)
      .then((data) => data?.fname ?? author);
  });
}

export const telegramNotificationsService = new TelegramNotificationsService(
  env.MODERATION_TELEGRAM_BOT_TOKEN &&
  env.MODERATION_TELEGRAM_CHANNEL_ID &&
  env.MODERATION_TELEGRAM_WEBHOOK_URL &&
  env.MODERATION_TELEGRAM_WEBHOOK_SECRET
    ? {
        enabled: true,
        telegramBotToken: env.MODERATION_TELEGRAM_BOT_TOKEN,
        telegramChannelId: env.MODERATION_TELEGRAM_CHANNEL_ID,
        telegramWebhookUrl: env.MODERATION_TELEGRAM_WEBHOOK_URL,
        telegramWebhookSecret: env.MODERATION_TELEGRAM_WEBHOOK_SECRET,
      }
    : {
        enabled: false,
      },
);

export const moderationNotificationsService =
  new ModerationNotificationsService({
    enabled: env.MODERATION_ENABLE_NOTIFICATIONS,
    telegramNotificationsService,
    resolveAuthor,
  });

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

export const managementCommentDbService = new ManagementCommentDbService();

export const reportsNotificationsService = new ReportsNotificationsService({
  enabled: env.REPORTS_ENABLE_NOTIFICATIONS,
  telegramNotificationsService,
  resolveAuthor,
});

export const commentReportsService = new CommentReportsService({
  commentDbService,
  managementCommentDbService,
  notificationService: reportsNotificationsService,
});

export const premoderationService = env.MODERATION_ENABLED
  ? new PremoderationService({
      defaultModerationStatus: "pending",
      cacheService: premoderationCacheService,
      dbService: commentDbService,
    })
  : new NoopPremoderationService();

export const commentModerationService = new CommentModerationService({
  knownReactions: env.MODERATION_KNOWN_REACTIONS,
  premoderationService,
  notificationService: moderationNotificationsService,
  classifierService: commentModerationClassifierService,
  commentDbService,
});

export const telegramAdminBotService =
  env.ADMIN_TELEGRAM_BOT_ENABLED &&
  env.ADMIN_TELEGRAM_BOT_TOKEN &&
  env.ADMIN_TELEGRAM_BOT_WEBHOOK_URL &&
  env.ADMIN_TELEGRAM_BOT_WEBHOOK_SECRET
    ? new AdminTelegramBotService({
        botToken: env.ADMIN_TELEGRAM_BOT_TOKEN,
        apiRootUrl: env.ADMIN_TELEGRAM_BOT_API_ROOT_URL,
        allowedUserIds: env.ADMIN_TELEGRAM_BOT_ALLOWED_USER_IDS || [],
        webhookUrl: env.ADMIN_TELEGRAM_BOT_WEBHOOK_URL,
        webhookSecret: env.ADMIN_TELEGRAM_BOT_WEBHOOK_SECRET,
        commands: [
          new StartCommand(),
          new ReportCommand(),
          new ReportPendingCommand(),
        ],
        commentManagementDbService: managementCommentDbService,
      })
    : new NoopAdminBotService();
