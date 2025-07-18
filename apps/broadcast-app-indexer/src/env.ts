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
    CHAIN_BASE_BROADCAST_HOOK_START_BLOCK: z.number().min(0).optional(),
    CHAIN_BASE_COMMENT_MANAGER_START_BLOCK: z.number().min(0).optional(),
    CHAIN_BASE_CHANNEL_MANAGER_START_BLOCK: z.number().min(0).optional(),
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
  BROADCAST_APP_MINI_APP_URL: z.string().url(),
  DATABASE_URL: z.string().url(),
  DATABASE_SCHEMA: z.string().trim().nonempty(),
  NEYNAR_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
});

const EnvSchema = z.intersection(BaseConfig, ChainConfig);

const _env = EnvSchema.safeParse(process.env);

if (!_env.success) {
  console.error(_env.error.format());
  throw new Error("Invalid environment variables:" + _env.error.format());
}

export const env = _env.data;
