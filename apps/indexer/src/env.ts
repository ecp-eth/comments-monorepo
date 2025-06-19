import { z } from "zod";

const moderationNotificationsEnabledSchema = z.object({
  MODERATION_TELEGRAM_BOT_TOKEN: z.string().min(1),
  MODERATION_TELEGRAM_CHANNEL_ID: z.string().min(1),
  MODERATION_INDEXER_URL: z.string().url(),
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
    WEBHOOK_SECRET: z.string().min(1),
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
    MODERATION_TELEGRAM_BOT_TOKEN: z.string().optional(),
    MODERATION_TELEGRAM_CHANNEL_ID: z.string().optional(),
    MODERATION_INDEXER_URL: z.string().url().optional(),
    PONDER_RPC_URL_8453: z.string().url().optional(),
    PONDER_START_BLOCK_8453: z.coerce.number().optional(),
  })
  .superRefine((vars, ctx) => {
    if (vars.MODERATION_ENABLED && vars.MODERATION_ENABLE_NOTIFICATIONS) {
      const result = moderationNotificationsEnabledSchema.safeParse(vars);

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
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
