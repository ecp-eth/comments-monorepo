import { HexSchema } from "@ecp.eth/sdk/core";
import { z } from "zod";

const ChainAnvilConfig = z.union([
  z.object({
    CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS: HexSchema,
    CHAIN_ANVIL_RPC_URL: z.string().url(),
  }),
  z.object({
    CHAIN_ANVIL_BROADCAST_HOOK_ADDRESS: z.never().optional(),
    CHAIN_ANVIL_RPC_URL: z.never().optional(),
  }),
]);

const ChainBaseConfig = z.union([
  z.object({
    CHAIN_BASE_BROADCAST_HOOK_ADDRESS: HexSchema,
    CHAIN_BASE_RPC_URL: z.string().url(),
    CHAIN_BASE_BROADCAST_HOOK_START_BLOCK: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),
    CHAIN_BASE_COMMENT_MANAGER_START_BLOCK: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),
    CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK: z.coerce
      .number()
      .int()
      .min(0)
      .optional(),
  }),
  z.object({
    CHAIN_BASE_BROADCAST_HOOK_ADDRESS: z.never().optional(),
    CHAIN_BASE_RPC_URL: z.never().optional(),
    CHAIN_BASE_BROADCAST_HOOK_START_BLOCK: z.never().optional(),
    CHAIN_BASE_COMMENT_MANAGER_START_BLOCK: z.never().optional(),
    CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK: z.never().optional(),
  }),
]);

const ChainConfig = z.intersection(ChainAnvilConfig, ChainBaseConfig);

const BaseConfig = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_SCHEMA: z.string().trim().nonempty(),
  NEYNAR_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  BROADCAST_MINI_APPS: z
    .record(
      z.string(),
      z.object({
        uri: z.string().url(),
        appId: HexSchema,
        notificationUrl: z.string().url(),
        notificationsIsolated: z
          .enum(["1", "0"])
          .default("1")
          .transform((v) => v === "1"),
        neynarApiKey: z.string().optional(),
      }),
    )
    .refine(
      (check) => {
        if (Object.keys(check).length === 0) {
          return false;
        }

        return true;
      },
      {
        message: "At least one BROADCAST_MINI_APP_{name}_URI must be set",
      },
    ),

  JWT_NONCE_TOKEN_LIFETIME: z.coerce.number().int().positive().default(600),
  JWT_ACCESS_TOKEN_LIFETIME: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TOKEN_LIFETIME: z.coerce
    .number()
    .int()
    .positive()
    .default(2592000),
  JWT_AUDIENCE_REFRESH: z.string().nonempty().default("refresh-token"),
  JWT_AUDIENCE_ACCESS: z.string().nonempty().default("access-token"),
  JWT_AUDIENCE_NONCE: z.string().nonempty().default("siwe-nonce"),
  JWT_ISSUER: z.string().nonempty().default("broadcast-app-indexer"),
  JWT_SECRET: z.string().nonempty(),
});

const EnvSchema = z.intersection(BaseConfig, ChainConfig);

const _env = EnvSchema.safeParse({
  ...process.env,
  BROADCAST_MINI_APPS: Object.entries(process.env).reduce(
    (uris, [key, value]) => {
      if (key.startsWith("BROADCAST_MINI_APP_") && value) {
        const [, , , appName] = key.split("_");

        if (!appName) {
          return uris;
        }

        if (!uris[appName]) {
          uris[appName] = {
            uri: "",
            appId: "",
            notificationUrl: "",
            notificationsIsolated: undefined,
            neynarApiKey: undefined,
          };
        }

        if (key.endsWith(`${appName}_URI`)) {
          uris[appName].uri = value;
        } else if (key.endsWith(`${appName}_APP_SIGNER_ADDRESS`)) {
          uris[appName].appId = value;
        } else if (key.endsWith(`${appName}_NOTIFICATION_URI`)) {
          uris[appName].notificationUrl = value;
        } else if (key.endsWith(`${appName}_ISOLATE_NOTIFICATIONS`)) {
          uris[appName].notificationsIsolated = value;
        } else if (key.endsWith(`${appName}_NEYNAR_API_KEY`)) {
          uris[appName].neynarApiKey = value;
        }
      }

      return uris;
    },
    {} as Record<
      string,
      {
        uri: string;
        appId: string;
        notificationUrl: string;
        notificationsIsolated: undefined | string;
        neynarApiKey: undefined | string;
      }
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
