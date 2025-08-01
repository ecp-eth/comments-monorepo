import { env } from "../env";
import { NeynarNotificationsService } from "./neynar-notifications-service";
import { NoopNotificationsService } from "./noop-notifications-service";
import { INotificationsService } from "./types";
import { db } from "./db";
import { FarcasterQuickAuthService } from "./farcaster-quick-auth-service";
import { MiniAppConfigRegistryService } from "./mini-app-config-registry-service";

export { db };

export const miniAppConfigRegistryService = new MiniAppConfigRegistryService({
  apps: env.BROADCAST_MINI_APPS,
});

export const farcasterQuickAuthService = new FarcasterQuickAuthService({
  miniAppConfigRegistryService,
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
