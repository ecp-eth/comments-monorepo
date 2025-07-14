import { z } from "zod";

const moderationNotificationsEnabledSchema = z.object({
  MODERATION_TELEGRAM_BOT_TOKEN: z.string().nonempty(),
  MODERATION_TELEGRAM_CHANNEL_ID: z.string().nonempty(),
  MODERATION_TELEGRAM_WEBHOOK_URL: z.string().url(),
  MODERATION_TELEGRAM_WEBHOOK_SECRET: z.string().nonempty(),
});

const classificationScoreThresholdSchema = z.coerce.number().min(0).max(1);

const moderationAutomaticClassificationEnabledSchema = z.object({
  MODERATION_MBD_API_KEY: z.string().nonempty(),
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

    REPORTS_NOTIFICATIONS_ENABLED: z
      .enum(["0", "1"])
      .default("0")
      .transform((val) => val === "1"),
  })
  .superRefine((vars, ctx) => {
    if (
      (vars.MODERATION_ENABLED && vars.MODERATION_ENABLE_NOTIFICATIONS) ||
      vars.REPORTS_NOTIFICATIONS_ENABLED
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

    return true;
  });

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface ProcessEnv extends z.infer<typeof EnvSchema> {}
  }
}

const _env = EnvSchema.safeParse(process.env);

if (!_env.success) {
  console.error(_env.error.format());
  throw new Error("Invalid environment variables:" + _env.error.format());
}

export const env = _env.data;

export const SUPPORTED_CHAIN_IDS: number[] = [];

for (const [key] of Object.entries(process.env)) {
  if (key.startsWith("PONDER_RPC_URL_")) {
    const chainId = key.substring("PONDER_RPC_URL_".length);

    SUPPORTED_CHAIN_IDS.push(z.coerce.number().int().positive().parse(chainId));
  }
}
