import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import type {
  INotificationsService,
  INotificationsService_NotifyArgs,
} from "./types";
import { db } from "./db";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { schema } from "../../schema";
import type { NeynarNotificationServiceQueueSelectType } from "../../schema.offchain";
import z from "zod";
import { MiniAppConfigRegistryService } from "./mini-app-config-registry-service";

const notificationValidator = z.object({
  body: z.string().min(1).max(128),
  title: z.string().min(1).max(32),
  targetUrl: z.string().url().max(256),
});

const MAX_FIDS_PER_REQUEST = 100;

type NeynarNotificationsServiceOptions = {
  db: typeof db;
  /**
   * Optional delay in milliseconds before processing notifications.
   *
   * @default 300
   */
  delay?: number;
  /**
   * Neynar API key
   */
  apiKey: string;
  /**
   * Maximum number of attempts to process a notification before giving up.
   *
   * @default 3
   */
  maxAttempts?: number;
  miniAppConfigRegistryService: MiniAppConfigRegistryService;
};

export class NeynarNotificationsService implements INotificationsService {
  private db: typeof db;
  private abortController: AbortController;
  private delay: number;
  private client: NeynarAPIClient;
  private maxAttempts: number;
  private miniAppConfigRegistryService: MiniAppConfigRegistryService;

  constructor(options: NeynarNotificationsServiceOptions) {
    this.db = options.db;
    this.abortController = new AbortController();
    this.delay = options.delay ?? 300;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.client = new NeynarAPIClient({
      apiKey: options.apiKey,
    });
    this.miniAppConfigRegistryService = options.miniAppConfigRegistryService;
  }

  async notify({
    channel,
    comment,
  }: INotificationsService_NotifyArgs): Promise<void> {
    const channelName = channel.name;
    let title = `New comment in ${channelName}`;

    if (title.length > 32) {
      title = title.slice(0, 29).trim() + "...";
    }

    const description =
      "Something new was posted in the channel you are subscribed to.";

    /**
     * Receives only notifications for comments created by itself
     */
    const isolatedApps = this.miniAppConfigRegistryService.getAppsByAppId(
      comment.app,
    );

    /**
     * Receives notifications for all comments
     */
    const nonIsolatedApps =
      this.miniAppConfigRegistryService.getAppsByAppId("*");

    const allApps = [...isolatedApps, ...nonIsolatedApps];

    for (const app of allApps) {
      const subscribers = await this.db.query.channelSubscription.findMany({
        columns: {
          userFid: true,
        },
        where: and(
          eq(schema.channelSubscription.appId, app.appId),
          eq(schema.channelSubscription.channelId, comment.channelId),
          eq(schema.channelSubscription.notificationsEnabled, true),
        ),
      });

      await this.db
        .insert(schema.neynarNotificationServiceQueue)
        .values({
          commentId: comment.commentId,
          appId: app.appId,
          pendingSubscriberFids: subscribers.map((s) => s.userFid),
          status: "pending" as const,
          notification: notificationValidator.parse({
            title,
            description,
            targetUrl: app.notificationUrl
              .replaceAll("{commentId}", comment.commentId)
              .replaceAll("{channelId}", comment.channelId.toString()),
          }),
        })
        .onConflictDoNothing();
    }
  }

  async process(): Promise<void> {
    const { signal } = this.abortController;

    while (true) {
      if (signal.aborted) {
        console.log("NeynarNotificationsService: Process aborted");
        return;
      }

      const notificationToProcessQuery = this.db
        .select({
          commentId: schema.neynarNotificationServiceQueue.commentId,
        })
        .from(schema.neynarNotificationServiceQueue)
        .where(
          or(
            // select pending notification
            eq(schema.neynarNotificationServiceQueue.status, "pending"),
            // or select failed notification that still has attempts left
            and(
              eq(schema.neynarNotificationServiceQueue.status, "failed"),
              lt(
                schema.neynarNotificationServiceQueue.attempts,
                this.maxAttempts, // only select failed notifications that have attempts left
              ),
            ),
          ),
        )
        .orderBy(asc(schema.neynarNotificationServiceQueue.createdAt))
        .limit(1)
        .as("notificationToProcess");

      // set first pending or failed notification as processing and return
      const [notificationToProcess] = await this.db
        .update(schema.neynarNotificationServiceQueue)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .from(notificationToProcessQuery)
        .where(
          eq(
            schema.neynarNotificationServiceQueue.commentId,
            notificationToProcessQuery.commentId,
          ),
        )
        .returning()
        .execute();

      if (notificationToProcess) {
        await this.handleNotification(notificationToProcess);
      }

      await new Promise((resolve) => {
        setTimeout(resolve, this.delay);
      });
    }
  }

  private async handleNotification(
    notification: NeynarNotificationServiceQueueSelectType,
  ) {
    // neynar has a limit of 100 fids per request
    const targetFids = notification.pendingSubscriberFids.slice(
      0,
      MAX_FIDS_PER_REQUEST,
    );
    const ramainingFids =
      notification.pendingSubscriberFids.slice(MAX_FIDS_PER_REQUEST);

    // edge case: if there are no fids to process, we can mark the notification as completed
    if (targetFids.length === 0) {
      await this.db
        .update(schema.neynarNotificationServiceQueue)
        .set({
          status: "completed",
          updatedAt: new Date(),
        })
        .where(
          eq(
            schema.neynarNotificationServiceQueue.commentId,
            notification.commentId,
          ),
        );

      return;
    }

    try {
      await this.client.publishFrameNotifications({
        targetFids,
        notification: {
          body: notification.notification.body,
          title: notification.notification.title,
          target_url: notification.notification.targetUrl,
          uuid: notification.notificationUUID,
        },
      });

      if (ramainingFids.length === 0) {
        // if there are no remaining fids, we can mark the notification as completed
        await this.db
          .update(schema.neynarNotificationServiceQueue)
          .set({
            pendingSubscriberFids: ramainingFids,
            status: "completed",
            updatedAt: new Date(),
          })
          .where(
            eq(
              schema.neynarNotificationServiceQueue.commentId,
              notification.commentId,
            ),
          );
      } else {
        // if there are remaining fids, we update the notification with the remaining fids
        await this.db
          .update(schema.neynarNotificationServiceQueue)
          .set({
            pendingSubscriberFids: ramainingFids,
            status: "pending",
            updatedAt: new Date(),
          })
          .where(
            eq(
              schema.neynarNotificationServiceQueue.commentId,
              notification.commentId,
            ),
          );
      }
    } catch (error) {
      console.error(
        "NeynarNotificationsService: Error processing notification",
        error,
      );

      await this.db
        .update(schema.neynarNotificationServiceQueue)
        .set({
          status: "failed",
          attempts: notification.attempts + 1,
          updatedAt: new Date(),
        })
        .where(
          eq(
            schema.neynarNotificationServiceQueue.commentId,
            notification.commentId,
          ),
        );
    }
  }

  abort(): void {
    this.abortController.abort();
    console.log("NeynarNotificationsService: Abort signal sent");
  }
}
