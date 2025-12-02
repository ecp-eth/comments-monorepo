import { env } from "../env";
import { CommentModerationClassifier } from "./mbd-comment-moderation-classifier";
import { ModerationNotificationsService } from "./moderation-notifications-service";
import { NoopCommentModerationClassifier } from "./noop-comment-moderation-classifier";
import { PremoderationService } from "./premoderation-service";
import { NoopPremoderationService } from "./noop-premoderation-service";
import { ClassificationCacheService } from "./classification-cache-service";
import { CommentReportsService } from "./comment-reports-service";
import { CommentModerationService } from "../management/services/comment-moderation-service";
import { type Hex } from "@ecp.eth/sdk/core";
import { ensByAddressResolverService } from "./ens-by-address-resolver";
import { ReportsNotificationsService } from "./reports-notifications-service";
import { TelegramNotificationsService } from "./telegram-notifications-service";
import { ensByNameResolverService } from "./ens-by-name-resolver";
import { erc20ByAddressResolverService } from "./erc20-by-address-resolver";
import { erc20ByTickerResolverService } from "./erc20-by-ticker-resolver";
import { farcasterByAddressResolverService } from "./farcaster-by-address-resolver";
import { farcasterByNameResolverService } from "./farcaster-by-name-resolver";
import { httpResolverService } from "./http-resolver";
import { ipfsResolverService } from "./ipfs-resolver";
import { NoopAdminBotService } from "./admin-noop-bot-service";
import { AdminTelegramBotService } from "./admin-telegram-bot-service";
import { StartCommand } from "./admin-telegram-bot-service/commands/start";
import { ReportCommand } from "./admin-telegram-bot-service/commands/report";
import { ReportPendingCommand } from "./admin-telegram-bot-service/commands/report-pending";
import { ModerateCommand } from "./admin-telegram-bot-service/commands/moderate";
import { ModeratePendingCommand } from "./admin-telegram-bot-service/commands/moderate-pending";
import { db } from "./db";
import { ManagementAuthService } from "../management/services/auth";
import { MutedAccountsManagementService } from "../management/services/muted-accounts";
import { SiweAuthService } from "./siwe-auth-service";
import config from "../../ponder.config.ts";
import { createSiweMiddleware } from "../middleware/siwe";
import { AppManager } from "./app-manager-service";
import { AppWebhookManager } from "./app-webhook-manager-service";
import { EventOutboxService } from "./events/event-outbox-service";
import { resolveCommentReferences } from "../lib/resolve-comment-references";
import { CommentReferencesResolutionService } from "./comment-references-resolution-service";
import { CommentReferencesCacheService } from "./comment-references-cache-service";
import { AppWebhookDeliveryManager } from "./app-webhook-delivery-manager-service";
import { NotificationService } from "./notification-service";
import { AppKeyAuthService } from "./app-key-auth-service";
import { createAppKeyMiddleware } from "../middleware/app-key";
import { NotificationOutboxService } from "./notifications/notification-outbox-service";
import { caip373QuotedCommentResolverService } from "./caip373-quoted-comment-resolver";
import { metrics } from "./metrics";
import { wrapServiceWithTracing } from "../telemetry";

export { db };

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

export const eventOutboxService = wrapServiceWithTracing(
  new EventOutboxService({
    db,
  }),
);

export const telegramNotificationsService = wrapServiceWithTracing(
  new TelegramNotificationsService(
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
  ),
);

export const moderationNotificationsService = wrapServiceWithTracing(
  new ModerationNotificationsService({
    enabled: env.MODERATION_ENABLE_NOTIFICATIONS,
    telegramNotificationsService,
    resolveAuthor,
  }),
);

const classifierCacheService = wrapServiceWithTracing(
  new ClassificationCacheService(db),
);

export const commentModerationClassifierService =
  env.MODERATION_ENABLE_AUTOMATIC_CLASSIFICATION && env.MODERATION_MBD_API_KEY
    ? wrapServiceWithTracing(
        new CommentModerationClassifier({
          apiKey: env.MODERATION_MBD_API_KEY,
          cacheService: classifierCacheService,
          metrics,
        }),
      )
    : wrapServiceWithTracing(new NoopCommentModerationClassifier());

export const managementAuthService = wrapServiceWithTracing(
  new ManagementAuthService(db),
);

export const reportsNotificationsService = wrapServiceWithTracing(
  new ReportsNotificationsService({
    enabled: env.REPORTS_ENABLE_NOTIFICATIONS,
    telegramNotificationsService,
    resolveAuthor,
  }),
);

export const commentReportsService = wrapServiceWithTracing(
  new CommentReportsService({
    db,
    notificationService: reportsNotificationsService,
  }),
);

export const premoderationService = env.MODERATION_ENABLED
  ? wrapServiceWithTracing(
      new PremoderationService({
        classificationThreshold:
          env.MODERATION_NOTIFICATION_TRIGGERING_CLASSIFICATION_THRESHOLD,
        db,
        eventOutboxService,
      }),
    )
  : wrapServiceWithTracing(new NoopPremoderationService());

export const commentModerationService = wrapServiceWithTracing(
  new CommentModerationService({
    knownReactions: env.MODERATION_KNOWN_REACTIONS,
    premoderationService,
    notificationService: moderationNotificationsService,
    classifierService: commentModerationClassifierService,
  }),
);

export const telegramAdminBotService =
  env.ADMIN_TELEGRAM_BOT_ENABLED &&
  env.ADMIN_TELEGRAM_BOT_TOKEN &&
  env.ADMIN_TELEGRAM_BOT_WEBHOOK_URL &&
  env.ADMIN_TELEGRAM_BOT_WEBHOOK_SECRET
    ? wrapServiceWithTracing(
        new AdminTelegramBotService({
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
        }),
      )
    : wrapServiceWithTracing(new NoopAdminBotService());

export const mutedAccountsManagementService = wrapServiceWithTracing(
  new MutedAccountsManagementService(db),
);

export const siweAuthService = wrapServiceWithTracing(
  new SiweAuthService({
    jwtNonceTokenAudience: env.JWT_SIWE_NONCE_AUDIENCE,
    jwtNonceTokenIssuer: env.JWT_SIWE_NONCE_ISSUER,
    jwtNonceTokenLifetime: env.JWT_SIWE_NONCE_LIFETIME,
    jwtNonceTokenPrivateKey: env.JWT_SIWE_NONCE_PRIVATE_KEY,
    jwtNonceTokenPublicKey: env.JWT_SIWE_NONCE_PUBLIC_KEY,

    jwtAccessTokenLifetime: env.JWT_ACCESS_TOKEN_LIFETIME,
    jwtAccessTokenIssuer: env.JWT_ACCESS_TOKEN_ISSUER,
    jwtAccessTokenAudience: env.JWT_ACCESS_TOKEN_AUDIENCE,
    jwtAccessTokenPrivateKey: env.JWT_ACCESS_TOKEN_PRIVATE_KEY,
    jwtAccessTokenPublicKey: env.JWT_ACCESS_TOKEN_PUBLIC_KEY,

    jwtRefreshTokenLifetime: env.JWT_REFRESH_TOKEN_LIFETIME,
    jwtRefreshTokenIssuer: env.JWT_REFRESH_TOKEN_ISSUER,
    jwtRefreshTokenAudience: env.JWT_REFRESH_TOKEN_AUDIENCE,
    jwtRefreshTokenPrivateKey: env.JWT_REFRESH_TOKEN_PRIVATE_KEY,
    jwtRefreshTokenPublicKey: env.JWT_REFRESH_TOKEN_PUBLIC_KEY,

    db,
    resolveChainClient: async (chainId) => {
      return config.chains[chainId]?.publicClient;
    },
  }),
);

export const siweMiddleware = wrapServiceWithTracing(
  createSiweMiddleware({
    siweAuthService,
  }),
);

export const appManager = wrapServiceWithTracing(
  new AppManager({
    db,
  }),
);

export const appWebhookManager = wrapServiceWithTracing(
  new AppWebhookManager({
    db,
    eventOutboxService,
  }),
);

export const commentReferencesCacheService = wrapServiceWithTracing(
  new CommentReferencesCacheService(db),
);

export const commentReferencesResolutionService = wrapServiceWithTracing(
  new CommentReferencesResolutionService({
    resolveCommentReferences: resolveCommentReferences,
    commentReferencesResolvers: {
      caip373QuotedCommentResolver: caip373QuotedCommentResolverService,
      ensByAddressResolver: ensByAddressResolverService,
      ensByNameResolver: ensByNameResolverService,
      erc20ByAddressResolver: erc20ByAddressResolverService,
      erc20ByTickerResolver: erc20ByTickerResolverService,
      farcasterByAddressResolver: farcasterByAddressResolverService,
      farcasterByNameResolver: farcasterByNameResolverService,
      httpResolver: httpResolverService,
      ipfsResolver: ipfsResolverService,
    },
    commentReferencesCacheService: commentReferencesCacheService,
  }),
);

export const appWebhookDeliveryManager = wrapServiceWithTracing(
  new AppWebhookDeliveryManager({
    db,
  }),
);

export const appKeyAuthService = wrapServiceWithTracing(
  new AppKeyAuthService({
    db,
  }),
);

export const appKeyMiddleware = wrapServiceWithTracing(
  createAppKeyMiddleware({
    appKeyService: appKeyAuthService,
  }),
);

export const notificationService = wrapServiceWithTracing(
  new NotificationService({
    db,
    ensByNameResolver: ensByNameResolverService,
  }),
);

export const notificationOutboxService = wrapServiceWithTracing(
  new NotificationOutboxService({
    db,
  }),
);
