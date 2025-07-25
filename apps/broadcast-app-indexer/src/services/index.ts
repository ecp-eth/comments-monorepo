import { env } from "../env";
import { NeynarNotificationsService } from "./neynar-notifications-service";
import { NoopNotificationsService } from "./noop-notifications-service";
import { INotificationsService } from "./types";
import { db } from "./db";

export { db };

export const notificationService: INotificationsService = env.NEYNAR_API_KEY
  ? new NeynarNotificationsService({
      apiKey: env.NEYNAR_API_KEY,
      db,
    })
  : new NoopNotificationsService();

notificationService.process();

if (globalThis.PONDER_COMMON) {
  console.info("Registering notification service graceful shutdown handler");

  globalThis.PONDER_COMMON.shutdown.add(async () => {
    notificationService.abort();
  });
}
