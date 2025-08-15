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

const EnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    NEYNAR_API_KEY: z.string().min(1),
    SENTRY_DSN: z.string().optional(),

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
    PONDER_START_BLOCK_8453: z.coerce.number().optional(),
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

const _env = EnvSchema.safeParse(process.env);

if (!_env.success) {
  throw new Error(
    "Invalid environment variables:" +
      JSON.stringify(_env.error.format(), null, 2),
  );
}

export const env = _env.data;

export const SUPPORTED_CHAIN_IDS: number[] = [];

for (const [key] of Object.entries(process.env)) {
  if (key.startsWith("PONDER_RPC_URL_")) {
    const chainId = key.substring("PONDER_RPC_URL_".length);

    SUPPORTED_CHAIN_IDS.push(z.coerce.number().int().positive().parse(chainId));
  }
}
