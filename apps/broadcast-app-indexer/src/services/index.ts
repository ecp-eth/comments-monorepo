import { env } from "../env";
import { NeynarNotificationsService } from "./neynar-notifications-service";
import { NoopNotificationsService } from "./noop-notifications-service";
import { INotificationsService } from "./types";

export { db } from "./db";

export const notificationService: INotificationsService = env.NEYNAR_API_KEY
  ? new NeynarNotificationsService()
  : new NoopNotificationsService();
