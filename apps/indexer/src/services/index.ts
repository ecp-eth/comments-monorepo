import { env } from "../env.ts";
import { CommentModerationClassifier } from "./mbd-comment-moderation-classifier.ts";
import { ModerationNotificationsService } from "./moderation-notifications-service.ts";
import { NoopCommentModerationClassifier } from "./noop-comment-moderation-classifier.ts";
import { PremoderationService } from "./premoderation-service.ts";
import { NoopPremoderationService } from "./noop-premoderation-service.ts";
import { ClassificationCacheService } from "./classification-cache-service.ts";
import { CommentReportsService } from "./comment-reports-service.ts";
import { CommentModerationService } from "../management/services/comment-moderation-service.ts";
import { type Hex } from "@ecp.eth/sdk/core";
import { ensByAddressResolverService } from "./ens-by-address-resolver.ts";
import { farcasterByAddressResolverService } from "./farcaster-by-address-resolver.ts";
import { ReportsNotificationsService } from "./reports-notifications-service.ts";
import { TelegramNotificationsService } from "./telegram-notifications-service.ts";
import { NoopAdminBotService } from "./admin-noop-bot-service.ts";
import { AdminTelegramBotService } from "./admin-telegram-bot-service/index.ts";
import { StartCommand } from "./admin-telegram-bot-service/commands/start.ts";
import { ReportCommand } from "./admin-telegram-bot-service/commands/report.ts";
import { ReportPendingCommand } from "./admin-telegram-bot-service/commands/report-pending.ts";
import { ModerateCommand } from "./admin-telegram-bot-service/commands/moderate.ts";
import { ModeratePendingCommand } from "./admin-telegram-bot-service/commands/moderate-pending.ts";
import { db } from "./db.ts";
import { ManagementAuthService } from "../management/services/auth.ts";
import { MutedAccountsManagementService } from "../management/services/muted-accounts.ts";
import { SiweAuthService } from "./siwe-auth-service.ts";
import config from "../../ponder.config.ts";
import { createSiweMiddleware } from "../middleware/siwe.ts";
import { AppManager } from "./app-manager-service.ts";
import { AppWebhookManager } from "./app-webhook-manager-service.ts";
import { EventOutboxService } from "./event-outbox-service.ts";

export { db };

export { ensByAddressResolverService } from "./ens-by-address-resolver.ts";
export { ensByNameResolverService } from "./ens-by-name-resolver.ts";
export { erc20ByAddressResolverService } from "./erc20-by-address-resolver.ts";
export { erc20ByTickerResolverService } from "./erc20-by-ticker-resolver.ts";
export { farcasterByAddressResolverService } from "./farcaster-by-address-resolver.ts";
export { farcasterByNameResolverService } from "./farcaster-by-name-resolver.ts";
export { urlResolverService } from "./url-resolver.ts";

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
  env.MODERATION_TELEGRAM_WEBHOOK_SECRET &&
  env.MODERATION_ENABLE_NOTIFICATIONS
    ? {
        enabled: true,
        telegramBotToken: env.MODERATION_TELEGRAM_BOT_TOKEN,
        telegramChannelId: env.MODERATION_TELEGRAM_CHANNEL_ID,
        telegramWebhookUrl: env.MODERATION_TELEGRAM_WEBHOOK_URL,
        telegramWebhookSecret: env.MODERATION_TELEGRAM_WEBHOOK_SECRET,
        telegramApiRootUrl: env.MODERATION_TELEGRAM_API_ROOT_URL,
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

const classifierCacheService = new ClassificationCacheService(db);

export const commentModerationClassifierService =
  env.MODERATION_ENABLE_AUTOMATIC_CLASSIFICATION && env.MODERATION_MBD_API_KEY
    ? new CommentModerationClassifier({
        apiKey: env.MODERATION_MBD_API_KEY,
        cacheService: classifierCacheService,
      })
    : new NoopCommentModerationClassifier();

export const managementAuthService = new ManagementAuthService(db);

export const reportsNotificationsService = new ReportsNotificationsService({
  enabled: env.REPORTS_ENABLE_NOTIFICATIONS,
  telegramNotificationsService,
  resolveAuthor,
});

export const commentReportsService = new CommentReportsService({
  db,
  notificationService: reportsNotificationsService,
});

export const premoderationService = env.MODERATION_ENABLED
  ? new PremoderationService({
      classificationThreshold:
        env.MODERATION_NOTIFICATION_TRIGGERING_CLASSIFICATION_THRESHOLD,
      db,
    })
  : new NoopPremoderationService();

export const commentModerationService = new CommentModerationService({
  knownReactions: env.MODERATION_KNOWN_REACTIONS,
  premoderationService,
  notificationService: moderationNotificationsService,
  classifierService: commentModerationClassifierService,
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
          new ModerateCommand(),
          new ModeratePendingCommand(),
        ],
        premoderationService,
        reportsService: commentReportsService,
        resolveAuthor,
      })
    : new NoopAdminBotService();

export const mutedAccountsManagementService =
  new MutedAccountsManagementService(db);

export const siweAuthService = new SiweAuthService({
  jwtNonceTokenAudience: env.JWT_SIWE_NONCE_AUDIENCE,
  jwtNonceTokenIssuer: env.JWT_SIWE_NONCE_ISSUER,
  jwtNonceTokenLifetime: env.JWT_SIWE_NONCE_LIFETIME,
  jwtNonceTokenSecret: env.JWT_SIWE_NONCE_SECRET,

  jwtAccessTokenLifetime: env.JWT_ACCESS_TOKEN_LIFETIME,
  jwtAccessTokenIssuer: env.JWT_ACCESS_TOKEN_ISSUER,
  jwtAccessTokenAudience: env.JWT_ACCESS_TOKEN_AUDIENCE,
  jwtAccessTokenSecret: env.JWT_ACCESS_TOKEN_SECRET,

  jwtRefreshTokenLifetime: env.JWT_REFRESH_TOKEN_LIFETIME,
  jwtRefreshTokenIssuer: env.JWT_REFRESH_TOKEN_ISSUER,
  jwtRefreshTokenAudience: env.JWT_REFRESH_TOKEN_AUDIENCE,
  jwtRefreshTokenSecret: env.JWT_REFRESH_TOKEN_SECRET,

  db,
  resolveChainClient: async (chainId) => {
    return config.chains[chainId]?.publicClient;
  },
});

export const siweMiddleware = createSiweMiddleware({
  siweAuthService,
});

export const appManager = new AppManager({
  db,
});

export const appWebhookManager = new AppWebhookManager({
  db,
});

export const eventOutboxService = new EventOutboxService({
  db,
});
