import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { HexSchema } from "@ecp.eth/sdk/core";
import { z } from "zod";

const moderationNotificationsEnabledSchema = z.object({
  MODERATION_NOTIFICATION_TRIGGERING_CLASSIFICATION_THRESHOLD: z.coerce
    .number()
    .min(0)
    .max(100),
  MODERATION_TELEGRAM_BOT_TOKEN: z.string().nonempty(),
  MODERATION_TELEGRAM_CHANNEL_ID: z.string().nonempty(),
  MODERATION_TELEGRAM_WEBHOOK_URL: z.string().url(),
  MODERATION_TELEGRAM_WEBHOOK_SECRET: z.string().nonempty(),
});

const classificationScoreThresholdSchema = z.coerce.number().min(0).max(1);

const moderationAutomaticClassificationEnabledSchema = z.object({
  MODERATION_MBD_API_KEY: z.string().nonempty(),
});

const telegramUserIdSchema = z.coerce.number().int().positive();
const telegramUserIdsRequiredSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return val;
}, z.array(telegramUserIdSchema).min(1));
const telegramUserIdsOptionalSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return val;
}, z.array(telegramUserIdSchema).optional());

const adminTelegramBotSchema = z.object({
  ADMIN_TELEGRAM_BOT_ALLOWED_USER_IDS: telegramUserIdsRequiredSchema,
  ADMIN_TELEGRAM_BOT_TOKEN: z.string().nonempty(),
  ADMIN_TELEGRAM_BOT_WEBHOOK_URL: z.string().url(),
  ADMIN_TELEGRAM_BOT_WEBHOOK_SECRET: z.string().nonempty(),
  ADMIN_TELEGRAM_BOT_API_ROOT_URL: z.string().url().optional(),
});

type AllowedChainIds = keyof typeof SUPPORTED_CHAINS;

const ChainConfigs = z.record(
  z.coerce.number(),
  z
    .object({
      chainId: z.custom<AllowedChainIds>(
        (val) => {
          if (typeof val !== "number") {
            return false;
          }

          return Object.keys(SUPPORTED_CHAINS).includes(val.toString());
        },
        {
          message:
            "Invalid chain ID. Must be one of: " +
            Object.keys(SUPPORTED_CHAINS).join(", "),
        },
      ),
      rpcUrl: z.string().url(),
      startBlock: z.coerce.number().int().nonnegative().optional(),
    })
    .transform((val) => {
      return {
        ...SUPPORTED_CHAINS[val.chainId],
        ...val,
      };
    }),
);

const EnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    DATABASE_SCHEMA: z.string().optional(),
    NEYNAR_API_KEY: z.string().min(1),
    SENTRY_DSN: z.string().optional(),
    SENTRY_PROFILING_ENABLED: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    SENTRY_TRACING_ENABLED: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),

    // Pinata IPFS configuration
    PINATA_JWT: z.string().min(1),
    PINATA_GATEWAY: z
      .string()
      .refine(
        (val) => !val.startsWith("http://") && !val.startsWith("https://"),
        {
          message:
            "Gateway domain must not include protocol (http:// or https://)",
        },
      ),

    IPFS_RESOLUTION_RETRY_COUNT: z.coerce.number().int().positive().default(5),
    IPFS_RESOLUTION_RETRY_TIMEOUT: z.coerce
      .number()
      .int()
      .positive()
      .default(500),

    // this one is more of an internal flag so we can compile the indexer for docs
    SKIP_DRIZZLE_SCHEMA_DETECTION: z
      .enum(["0", "1"])
      .transform((val) => val === "1")
      .default("0"),
    MODERATION_ENABLED: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    MODERATION_NOTIFICATION_TRIGGERING_CLASSIFICATION_THRESHOLD: z.coerce
      .number()
      .min(0)
      .max(100)
      .default(0),
    MODERATION_ENABLE_NOTIFICATIONS: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    MODERATION_KNOWN_REACTIONS: z
      .string()
      .default("")
      .transform(
        (val) =>
          new Set(
            val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          ),
      ),
    MODERATION_ENABLE_AUTOMATIC_CLASSIFICATION: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    MODERATION_MBD_API_KEY: z.string().optional(),
    MODERATION_TELEGRAM_API_ROOT_URL: z.string().url().optional(),
    MODERATION_TELEGRAM_BOT_TOKEN: z.string().optional(),
    MODERATION_TELEGRAM_CHANNEL_ID: z.string().optional(),
    MODERATION_TELEGRAM_WEBHOOK_URL: z.string().url().optional(),
    MODERATION_TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    PONDER_RPC_URL_8453: z.string().url().optional(),
    PONDER_START_BLOCK_8453: z.coerce.number().int().min(0).optional(),
    ENS_RPC_URL: z.string().url(),
    ENSNODE_SUBGRAPH_URL: z.string().url().optional(),
    SIM_API_KEY: z.string().nonempty(),
    COMMENT_CONTENT_LENGTH_LIMIT: z.coerce.number().default(1024 * 10),
    TELEGRAM_MESSAGE_LENGTH_LIMIT: z.coerce.number().default(4000),

    MODERATION_DEFAULT_CLASSIFICATION_SCORE_THRESHOLD:
      classificationScoreThresholdSchema.default(0.2),
    MODERATION_CLASSIFICATION_HARASSMENT_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_HATE_THREATENING_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_HATE_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_LLM_GENERATED_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_SELF_HARM_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_SEXUAL_MINORS_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_SEXUAL_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_SPAM_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_VIOLENCE_GRAPHIC_THRESHOLD:
      classificationScoreThresholdSchema.optional(),
    MODERATION_CLASSIFICATION_VIOLENCE_THRESHOLD:
      classificationScoreThresholdSchema.optional(),

    REPORTS_ENABLE_NOTIFICATIONS: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),

    ADMIN_TELEGRAM_BOT_ENABLED: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
    ADMIN_TELEGRAM_BOT_ALLOWED_USER_IDS:
      telegramUserIdsOptionalSchema.optional(),
    ADMIN_TELEGRAM_BOT_TOKEN: z.string().optional(),
    ADMIN_TELEGRAM_BOT_WEBHOOK_URL: z.string().url().optional(),
    ADMIN_TELEGRAM_BOT_WEBHOOK_SECRET: z.string().optional(),
    ADMIN_TELEGRAM_BOT_API_ROOT_URL: z.string().url().optional(),

    CHAIN_CONFIGS: ChainConfigs,
    CHAIN_ANVIL_START_BLOCK: z.coerce.number().int().min(0).optional(),
    CHAIN_ANVIL_ECP_CHANNEL_MANAGER_ADDRESS_OVERRIDE: HexSchema.optional(),
    CHAIN_ANVIL_ECP_COMMENT_MANAGER_ADDRESS_OVERRIDE: HexSchema.optional(),

    JWT_SIWE_NONCE_PRIVATE_KEY: z.string().nonempty(),
    JWT_SIWE_NONCE_PUBLIC_KEY: z.string().nonempty(),
    JWT_SIWE_NONCE_LIFETIME: z.coerce.number().int().positive().default(600),
    JWT_SIWE_NONCE_ISSUER: z.string().nonempty().default("ecp-indexer"),
    JWT_SIWE_NONCE_AUDIENCE: z.string().nonempty().default("ecp-indexer-nonce"),

    JWT_ACCESS_TOKEN_PRIVATE_KEY: z.string().nonempty(),
    JWT_ACCESS_TOKEN_PUBLIC_KEY: z.string().nonempty(),
    JWT_ACCESS_TOKEN_LIFETIME: z.coerce.number().int().positive().default(900),
    JWT_ACCESS_TOKEN_ISSUER: z.string().nonempty().default("ecp-indexer"),
    JWT_ACCESS_TOKEN_AUDIENCE: z.string().nonempty().default("ecp-indexer-at"),

    JWT_REFRESH_TOKEN_PRIVATE_KEY: z.string().nonempty(),
    JWT_REFRESH_TOKEN_PUBLIC_KEY: z.string().nonempty(),
    JWT_REFRESH_TOKEN_LIFETIME: z.coerce
      .number()
      .int()
      .positive()
      .default(2592000),
    JWT_REFRESH_TOKEN_ISSUER: z.string().nonempty().default("ecp-indexer"),
    JWT_REFRESH_TOKEN_AUDIENCE: z.string().nonempty().default("ecp-indexer-rt"),
    OPENTELEMETRY_GRAFANA_TEMPO_URL: z.string().url().optional(),
    OPENTELEMETRY_ENABLED: z
      .enum(["0", "1", "yes", "no", "true", "false"])
      .default("false")
      .transform((val) => val === "1" || val === "yes" || val === "true"),
    OPENTELEMETRY_BATCH_PROCESSOR_EXPORT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(5000),
    OPENTELEMETRY_BATCH_PROCESSOR_MAX_QUEUE_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    OPENTELEMETRY_BATCH_PROCESSOR_SCHEDULED_DELAY_MS: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
    OPENTELEMETRY_BATCH_PROCESSOR_MAX_EXPORT_BATCH_SIZE: z.coerce
      .number()
      .int()
      .positive()
      .optional(),
  })
  .superRefine((vars, ctx) => {
    if (
      (vars.MODERATION_ENABLED && vars.MODERATION_ENABLE_NOTIFICATIONS) ||
      vars.REPORTS_ENABLE_NOTIFICATIONS
    ) {
      const result = moderationNotificationsEnabledSchema.safeParse(vars);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });

        return z.NEVER;
      }
    }

    if (vars.MODERATION_ENABLE_AUTOMATIC_CLASSIFICATION) {
      const result =
        moderationAutomaticClassificationEnabledSchema.safeParse(vars);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });

        return z.NEVER;
      }
    }

    if (vars.ADMIN_TELEGRAM_BOT_ENABLED) {
      const result = adminTelegramBotSchema.safeParse(vars);

      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue(issue);
        });

        return z.NEVER;
      }
    }

    return true;
  });

const _env = EnvSchema.safeParse({
  ...process.env,
  CHAIN_CONFIGS: Object.entries(process.env).reduce(
    (acc, [key, value]) => {
      if (!key.startsWith("PONDER_RPC_URL_")) {
        return acc;
      }

      const chainId = z.coerce
        .number()
        .int()
        .positive()
        .parse(key.substring("PONDER_RPC_URL_".length), {
          path: [key],
        });
      const startBlock = z.coerce
        .number()
        .int()
        .min(0)
        .optional()
        .parse(process.env[`PONDER_START_BLOCK_${chainId}`], {
          path: [`PONDER_START_BLOCK_${chainId}`],
        });

      acc[chainId] = {
        chainId,
        startBlock,
        rpcUrl: z
          .string()
          .url()
          .parse(value, {
            path: [key],
          }),
      };

      return acc;
    },
    {} as Record<
      number,
      { chainId: number; rpcUrl: string; startBlock?: number }
    >,
  ),
});

if (!_env.success) {
  throw new Error(
    "Invalid environment variables:" +
      JSON.stringify(_env.error.format(), null, 2),
  );
}

export const env = _env.data;

export const SUPPORTED_CHAIN_IDS: number[] = Object.values(
  env.CHAIN_CONFIGS,
).map((chainConfig) => chainConfig.chainId);
