import { env } from "../env";
import { NeynarNotificationsService } from "./neynar-notifications-service";
import { NoopNotificationsService } from "./noop-notifications-service";
import { INotificationsService } from "./types";
import { db } from "./db";
import { FarcasterQuickAuthService } from "./farcaster-quick-auth-service";
import { MiniAppConfigRegistryService } from "./mini-app-config-registry-service";
import { SiweAuthService } from "./siwe-auth-service";
import { createPublicClient, http } from "viem";
import config from "../../ponder.config";
import { anvil, base } from "viem/chains";

export { db };

const publicClient = createPublicClient({
  chain: config.chains.base ? base : anvil,
  transport: http(
    config.chains.base ? env.CHAIN_BASE_RPC_URL : env.CHAIN_ANVIL_RPC_URL,
  ),
});

export const miniAppConfigRegistryService = new MiniAppConfigRegistryService({
  apps: env.BROADCAST_MINI_APPS,
});

export const farcasterQuickAuthService = new FarcasterQuickAuthService({
  miniAppConfigRegistryService,
});

export const siweAuthService = new SiweAuthService({
  db,
  miniAppConfigRegistryService,
  jwtSecret: env.JWT_SECRET,
  jwtIssuer: env.JWT_ISSUER,
  jwtAudienceNonce: env.JWT_AUDIENCE_NONCE,
  jwtNonceTokenLifetime: env.JWT_NONCE_TOKEN_LIFETIME,
  jwtAudienceAccessToken: env.JWT_AUDIENCE_ACCESS,
  jwtAudienceRefreshToken: env.JWT_AUDIENCE_REFRESH,
  jwtAccessTokenLifetime: env.JWT_ACCESS_TOKEN_LIFETIME,
  jwtRefreshTokenLifetime: env.JWT_REFRESH_TOKEN_LIFETIME,
  publicClient,
});

export const notificationService: INotificationsService = env.NEYNAR_API_KEY
  ? new NeynarNotificationsService({
      apiKey: env.NEYNAR_API_KEY,
      db,
      miniAppConfigRegistryService,
    })
  : new NoopNotificationsService();

notificationService.process();

if (globalThis.PONDER_COMMON) {
  console.info("Registering notification service graceful shutdown handler");

  globalThis.PONDER_COMMON.shutdown.add(async () => {
    notificationService.abort();
  });
}
