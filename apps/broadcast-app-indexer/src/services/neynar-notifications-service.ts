import type { Hex } from "@ecp.eth/sdk/core";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import type { INotificationsService, NotificationDetails } from "./types";
import { db } from "./db";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { schema } from "../../schema";
import type { NeynarNotificationServiceQueueSelectType } from "../../schema.offchain";
import z from "zod";

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
};

export class NeynarNotificationsService implements INotificationsService {
  private db: typeof db;
  private abortController: AbortController;
  private delay: number;
  private client: NeynarAPIClient;
  private maxAttempts: number;

  constructor(options: NeynarNotificationsServiceOptions) {
    this.db = options.db;
    this.abortController = new AbortController();
    this.delay = options.delay ?? 300;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.client = new NeynarAPIClient({
      apiKey: options.apiKey,
    });
  }

  async notify(
    subscribers: number[],
    commentId: Hex,
    details: NotificationDetails,
  ): Promise<void> {
    notificationValidator.parse(details);

    await this.db
      .insert(schema.neynarNotificationServiceQueue)
      .values({
        commentId,
        pendingSubscriberFids: subscribers,
        status: "pending",
        notification: details,
      })
      .onConflictDoNothing();
  }

  async process(): Promise<void> {
    const { signal } = this.abortController;

    while (true) {
      if (signal.aborted) {
        console.log("NeynarNotificationsService: Process aborted");
        return;
      }

      // set first pending or failed notification as processing and return
      const [notificationToProcess] = await this.db
        .update(schema.neynarNotificationServiceQueue)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .from(
          this.db
            .select()
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
            .as("notificationToProcess"),
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
}
