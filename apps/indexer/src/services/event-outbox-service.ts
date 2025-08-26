import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema.ts";
import z from "zod";
import { createTestEvent } from "../events/test/index.ts";

const PublishTestEventParamsSchema = z.object({
  appId: z.string().uuid(),
  webhookId: z.string().uuid(),
});

type EventOutboxService_PublishTestEventParams = z.infer<
  typeof PublishTestEventParamsSchema
>;

type EventOutboxServiceOptions = {
  db: NodePgDatabase<typeof schema>;
};

export class EventOutboxService {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(options: EventOutboxServiceOptions) {
    this.db = options.db;
  }

  async publishTestEvent(params: EventOutboxService_PublishTestEventParams) {
    const { appId, webhookId } = PublishTestEventParamsSchema.parse(params);

    const event = createTestEvent({
      appId,
      webhookId,
    });

    await this.db
      .insert(schema.eventOutbox)
      .values({
        aggregateType: "app-webhook",
        aggregateId: webhookId,
        eventType: event.event,
        eventUid: event.uid,
        payload: event,
      })
      .execute();
  }
}
