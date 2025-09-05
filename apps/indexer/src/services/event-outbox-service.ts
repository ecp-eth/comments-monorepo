import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { schema } from "../../schema.ts";
import type { EventOutboxAggregateType, Events } from "../events/types.ts";

type EventOutboxServiceOptions = {
  db: NodePgDatabase<typeof schema>;
};

export class EventOutboxService {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(options: EventOutboxServiceOptions) {
    this.db = options.db;
  }

  async publishEvent({
    event,
    aggregateId,
    aggregateType,
    tx,
  }: {
    event: Events;
    /**
     * The type of the aggregate that the event belongs to.
     */
    aggregateType: EventOutboxAggregateType;
    /**
     * The id of the aggregate that the event belongs to.
     */
    aggregateId: string;
    /**
     * If provided, the event will be published to the given transaction.
     * If not provided, the event will be published to the default database connection.
     */
    tx?: PgTransaction<
      PgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
  }): Promise<void> {
    const connection = tx ?? this.db;

    await connection
      .insert(schema.eventOutbox)
      .values({
        aggregateType,
        aggregateId,
        eventType: event.event,
        eventUid: event.uid,
        payload: event,
        payloadSize: Buffer.byteLength(JSON.stringify(event), "utf-8"),
      })
      // dedupe events, this can happen if a new version of indexer is deployed
      // and it reindexes on chain data
      .onConflictDoNothing({
        target: [schema.eventOutbox.eventUid],
      })
      .execute();
  }
}
