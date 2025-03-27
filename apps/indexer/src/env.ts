import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string(),
  NEYNAR_API_KEY: z.string(),
  SENTRY_DSN: z.string().optional(),
  MODERATION_ENABLED: z
    .enum(["0", "1"])
    .transform((val) => val === "1")
    .default("0"),
  // this one is more of an internal flag so we can compile the indexer for docs
  SKIP_DRIZZLE_SCHEMA_DETECTION: z
    .enum(["0", "1"])
    .transform((val) => val === "1")
    .default("0"),
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
