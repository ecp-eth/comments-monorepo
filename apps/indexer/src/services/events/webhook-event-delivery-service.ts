import { and, eq, lt, sql } from "drizzle-orm";
import isNetworkError from "is-network-error";
import { createHmac } from "node:crypto";
import Deferred from "promise-deferred";
import { schema } from "../../../schema.ts";
import type { DB } from "../db.ts";

type WebhookEventDeliveryService_DeliverEventsParams = {
  signal: AbortSignal;
};

type WebhookEventDeliveryServiceOptions = {
  db: DB;
  /**
   * Polling interval in milliseconds for checking for new deliveries.
   * This works as fallback to LISTEN/NOTIFY if there are no new deliveries.
   *
   * Keep the interval low enough because there is no notification triggered
   * if the delivery should be retried.
   *
   * @default 1000
   */
  pollInterval?: number;

  /**
   * Number of deliveries to process in a single batch.
   *
   * @default 20
   */
  batchSize?: number;

  /**
   * Maximum number of delivery attempts before giving up.
   *
   * @default 20
   */
  maxDeliveryAttempts?: number;

  /**
   * Timeout for the request to the webhook.
   *
   * @default 5000
   */
  requestTimeout?: number;
};

export class WebhookEventDeliveryService {
  private readonly db: DB;
  private readonly pollInterval: number;
  private readonly batchSize: number;
  private readonly requestTimeout: number;
  private readonly maxDeliveryAttempts: number;
  private deferred: Deferred.Deferred<void> | undefined;
  private shouldProcessBatch: boolean;

  constructor(options: WebhookEventDeliveryServiceOptions) {
    this.db = options.db;
    this.pollInterval = options.pollInterval ?? 1000;
    this.batchSize = options.batchSize ?? 20;
    this.requestTimeout = options.requestTimeout ?? 5_000;
    this.maxDeliveryAttempts = options.maxDeliveryAttempts ?? 20;
    this.shouldProcessBatch = false;
  }

  async deliverEvents(
    params: WebhookEventDeliveryService_DeliverEventsParams,
  ): Promise<void> {
    const { signal } = params;

    const notificationPgClient = await this.db.$client.connect();

    if (!notificationPgClient) {
      throw new Error("Failed to connect to notification pg client");
    }

    const processBatchListener = () => {
      // if there is a deferred, resolve it (we are already waiting for new deliveries)
      if (this.deferred) {
        this.deferred.resolve();
      } else {
        // this will be picked by the `waitForNewDeliveries()` method
        // and immediately resolve the new promise
        this.shouldProcessBatch = true;
      }
    };

    // start listening for new deliveries using notifications
    await notificationPgClient.query("LISTEN webhook_deliveries_events");
    notificationPgClient.on("notification", processBatchListener);

    // fallback to polling if there were no notifications for {this.interval} seconds
    const intervalId = setInterval(processBatchListener, this.pollInterval);

    /**
     * Cleanup function to be called when the service is aborted (loop is broken on condition)
     */
    const cleanup = () => {
      clearInterval(intervalId);
      notificationPgClient.removeListener("notification", processBatchListener);
      notificationPgClient.release();
      this.deferred?.resolve();
    };

    // if the loop is waiting for new deliveries, resolve the deferred so the abort signal is picked up
    signal.addEventListener("abort", () => {
      this.deferred?.resolve();
    });

    while (!signal.aborted) {
      const { rows } = await this.db.transaction(async (tx) => {
        return tx.execute<{
          id: bigint;
          appWebhookId: string;
          eventId: bigint;
        }>(sql`
          WITH
            -- select the head of the queue for each subscription (FIFO)
            subscription_pending_delivery_heads AS (
              SELECT DISTINCT ON (w.app_webhook_id) w.app_webhook_id, w.next_attempt_at, w.id, w.event_id
              FROM ${schema.appWebhookDelivery} w
              WHERE
                -- include expired leases
                w.status IN ('pending', 'processing')
                AND 
                w.next_attempt_at <= now()
                AND NOT EXISTS(
                  SELECT 1
                  FROM ${schema.appWebhookDelivery} x
                  WHERE
                    x.app_webhook_id = w.app_webhook_id
                    AND
                    x.status = 'processing'
                    AND 
                    x.lease_until > now()
                )
              ORDER BY w.app_webhook_id, w.next_attempt_at, w.id
            ),
  
            -- avoid lock spray
            subscription_pending_deliveries AS (
              SELECT *
              FROM subscription_pending_delivery_heads
              ORDER BY next_attempt_at, id
              LIMIT ${this.batchSize}
            ),
  
            -- lock the head of the queue for each subscription (FIFO)
            subscription_pending_deliveries_locked AS (
              SELECT h.*
              FROM subscription_pending_deliveries h
              WHERE pg_try_advisory_xact_lock(hashtextextended(h.app_webhook_id::text, 0)) -- non blocking lock
              ORDER BY h.next_attempt_at, h.id
            )
  
            -- update the deliveries to processing
            UPDATE ${schema.appWebhookDelivery} d
            SET 
              status = 'processing',
              lease_until = NOW() + interval '60 seconds'
            FROM subscription_pending_deliveries_locked l
            WHERE l.id = d.id
            RETURNING d.id, d.app_webhook_id, d.event_id
        `);
      });

      // if no rows were returned we essentially processed all the deliveries
      // otherwise we want to drain the queue completely
      if (rows.length === 0) {
        // if there are no rows, wait for the next interval
        await this.waitForNewDeliveries();
        // reset the deferred so it will be again created by the waitForNewDeliveries method
        // and resolved either by notification or interval
        this.deferred = undefined;
        this.shouldProcessBatch = false;

        continue;
      }

      // we could use all settled here but we prefer to fail if there is some unhandled error
      await Promise.all(rows.map((row) => this.deliver(row.id)));
    }

    cleanup();
  }

  private async deliver(deliveryId: bigint): Promise<void> {
    const delivery = await this.db.query.appWebhookDelivery.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, deliveryId);
      },
      with: {
        appWebhook: {
          with: {
            app: {
              with: {
                appSigningKeys: true,
              },
            },
          },
        },
        event: true,
      },
    });

    if (!delivery) {
      throw new Error(`Delivery with id ${deliveryId} not found`);
    }

    const attemptNumber = delivery?.attemptsCount + 1;

    const { appWebhook, event } = delivery;

    if (!appWebhook) {
      throw new Error(`Delivery with id ${deliveryId} has no app webhook`);
    }

    if (!event) {
      throw new Error(`Delivery with id ${deliveryId} has no event`);
    }

    const start = Date.now();

    try {
      const rawBody = JSON.stringify(event.payload);
      const signingKey = appWebhook.app.appSigningKeys[0];

      if (!signingKey) {
        throw new Error(`App with id ${appWebhook.app.id} has no signing key`);
      }

      const timestamp = Date.now();
      const signature = createHmac("sha256", signingKey.secret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
      const response = await fetch(appWebhook.url, {
        method: "POST",
        headers: {
          ...(appWebhook.auth.type === "http-basic-auth" && {
            [appWebhook.auth.headerName]: `Basic ${Buffer.from(
              `${appWebhook.auth.username}:${appWebhook.auth.password}`,
            ).toString("base64")}`,
          }),
          ...(appWebhook.auth.type === "header" && {
            [appWebhook.auth.headerName]: appWebhook.auth.headerValue,
          }),
          "Content-Type": "application/json",
          "X-ECP-Webhook-ID": appWebhook.id.toString(),
          "X-ECP-Webhook-Timestamp": timestamp.toString(),
          "X-ECP-Webhook-Signature": `v1=${signature}`,
        },
        redirect: "manual",
        body: rawBody,
        signal: AbortSignal.timeout(this.requestTimeout),
      }).catch((e) => {
        if (isAbortError(e)) {
          throw new WebhookDeliveryTimeoutError(this.requestTimeout);
        }

        if (isNetworkError(e)) {
          throw new WebhookDeliveryNetworkError(Date.now() - start);
        }

        throw e;
      });

      const responseMs = Date.now() - start;

      if (!response.ok) {
        throw new WebhookDeliveryError(
          `Webhook delivery failed with status ${response.status}`,
          response.status,
          responseMs,

          await response.text(),
        );
      }

      await this.db.transaction(async (tx) => {
        await tx
          .update(schema.appWebhook)
          .set({
            lastProcessedEventId: event.id,
          })
          .where(
            and(
              eq(schema.appWebhook.id, appWebhook.id),
              lt(schema.appWebhook.lastProcessedEventId, event.id),
            ),
          )
          .execute();

        await tx
          .insert(schema.appWebhookDeliveryAttempt)
          .values({
            appId: appWebhook.appId,
            ownerId: appWebhook.ownerId,
            eventId: event.id,
            appWebhookId: appWebhook.id,
            appWebhookDeliveryId: deliveryId,
            responseStatus: response.status,
            responseMs,
            attemptNumber,
          })
          .execute();

        await tx
          .update(schema.appWebhookDelivery)
          .set({
            status: "success",
            leaseUntil: null,
            attemptsCount: attemptNumber,
          })
          .where(eq(schema.appWebhookDelivery.id, deliveryId))
          .execute();
      });
    } catch (error) {
      if (!(error instanceof WebhookDeliveryError)) {
        throw error;
      }

      await this.db.transaction(async (tx) => {
        await tx
          .update(schema.appWebhook)
          .set({
            lastProcessedEventId: event.id,
          })
          .where(
            and(
              eq(schema.appWebhook.id, appWebhook.id),
              lt(schema.appWebhook.lastProcessedEventId, event.id),
            ),
          )
          .execute();

        await tx
          .insert(schema.appWebhookDeliveryAttempt)
          .values({
            appWebhookId: appWebhook.id,
            appId: appWebhook.appId,
            ownerId: appWebhook.ownerId,
            eventId: event.id,
            appWebhookDeliveryId: deliveryId,
            responseStatus: error.responseStatus,
            responseMs: error.responseMs,
            error: error.responseBodyText,
            attemptNumber,
          })
          .execute();

        if (delivery.attemptsCount <= this.maxDeliveryAttempts) {
          const exponentialBackoffSeconds = 2 ** delivery.attemptsCount;
          const maxJitterInSeconds = Math.ceil(exponentialBackoffSeconds * 0.2);
          const jitterInSeconds = Math.random() * maxJitterInSeconds;
          const nextAttemptAtSeconds = Math.round(
            exponentialBackoffSeconds + jitterInSeconds,
          );

          await tx
            .update(schema.appWebhookDelivery)
            .set({
              status: "pending",
              leaseUntil: null,
              nextAttemptAt: sql`NOW() + (${nextAttemptAtSeconds} || ' seconds')::interval`,
              attemptsCount: attemptNumber,
            })
            .where(eq(schema.appWebhookDelivery.id, deliveryId))
            .execute();
        } else {
          await tx
            .update(schema.appWebhookDelivery)
            .set({
              status: "failed",
              leaseUntil: null,
              lastError: error.responseBodyText,
              attemptsCount: attemptNumber,
            })
            .where(eq(schema.appWebhookDelivery.id, deliveryId))
            .execute();
        }
      });
    }
  }

  private async waitForNewDeliveries(): Promise<void> {
    this.deferred = new Deferred<void>();

    if (this.shouldProcessBatch) {
      this.deferred.resolve();
    }

    return this.deferred.promise;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (("code" in error && error.code === "ABORT_ERR") ||
      error.name === "AbortError")
  );
}

class WebhookDeliveryError extends Error {
  public readonly responseStatus: number;
  public readonly responseMs: number;
  public readonly responseBodyText: string;

  constructor(
    message: string,
    responseStatus: number,
    responseMs: number,
    responseBodyText: string,
  ) {
    super(message);
    this.responseStatus = responseStatus;
    this.responseMs = responseMs;
    this.responseBodyText = responseBodyText;
  }
}

class WebhookDeliveryTimeoutError extends WebhookDeliveryError {
  constructor(timeoutMs: number) {
    super(
      "Webhook delivery timed out",
      -1,
      timeoutMs,
      "Webhook delivery timed out",
    );
  }
}

class WebhookDeliveryNetworkError extends WebhookDeliveryError {
  constructor(responseMs: number) {
    super("Webhook delivery network error", -2, responseMs, "Network error");
  }
}
