import { schema } from "../../schema";
import type { AppWebhookDeliverySelectType } from "../../schema.offchain";
import type { DB } from "./db";
import { z } from "zod";

type AppWebhookDeliveryManagerOptions = {
  db: DB;
};

export class AppWebhookDeliveryManager implements IAppWebhookDeliveryManager {
  private readonly db: DB;

  constructor(options: AppWebhookDeliveryManagerOptions) {
    this.db = options.db;
  }

  async retryDelivery(params: IAppWebhookDeliveryManager_RetryDeliveryParams) {
    const { deliveryId, appId, webhookId } =
      RetryDeliveryParamsSchema.parse(params);

    return await this.db.transaction(async (tx) => {
      const delivery = await tx.query.appWebhookDelivery.findFirst({
        where(fields, operators) {
          return operators.and(
            operators.eq(fields.id, deliveryId),
            operators.eq(fields.appId, appId),
            operators.eq(fields.appWebhookId, webhookId),
          );
        },
      });

      if (!delivery) {
        throw new AppWebhookDeliveryManagerDeliveryNotFoundError();
      }

      if (delivery.status !== "failed") {
        throw new AppWebhookDeliveryManagerFailedToRetryDeliveryError(
          "Delivery must be in failed state to be retried",
        );
      }

      const [appWebhookDelivery] = await tx
        .insert(schema.appWebhookDelivery)
        .values({
          appId: delivery.appId,
          ownerId: delivery.ownerId,
          eventId: delivery.eventId,
          appWebhookId: delivery.appWebhookId,
          // we use app_webhook_id + event_id + retry_number to deduplicate deliveries
          retryNumber: delivery.retryNumber + 1,
        })
        .returning()
        .execute();

      if (!appWebhookDelivery) {
        throw new AppWebhookDeliveryManagerFailedToRetryDeliveryError();
      }

      return {
        appWebhookDelivery,
      };
    });
  }
}

const RetryDeliveryParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
  deliveryId: z.bigint(),
});

type IAppWebhookDeliveryManager_RetryDeliveryParams = z.infer<
  typeof RetryDeliveryParamsSchema
>;

type IAppWebhookDeliveryManager_RetryDeliveryResult = {
  appWebhookDelivery: AppWebhookDeliverySelectType;
};

export interface IAppWebhookDeliveryManager {
  retryDelivery(
    params: IAppWebhookDeliveryManager_RetryDeliveryParams,
  ): Promise<IAppWebhookDeliveryManager_RetryDeliveryResult>;
}

export class AppWebhookDeliveryManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppWebhookDeliveryManagerError";
  }
}

export class AppWebhookDeliveryManagerDeliveryNotFoundError extends AppWebhookDeliveryManagerError {
  constructor() {
    super("Delivery not found");
    this.name = "AppWebhookDeliveryManagerDeliveryNotFoundError";
  }
}

export class AppWebhookDeliveryManagerFailedToRetryDeliveryError extends AppWebhookDeliveryManagerError {
  constructor(message?: string) {
    super(message ?? "Failed to retry delivery");
    this.name = "AppWebhookDeliveryManagerFailedToRetryDeliveryError";
  }
}
