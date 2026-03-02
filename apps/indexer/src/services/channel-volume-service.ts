import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { schema } from "../../schema.ts";

type ChannelVolumeServiceOptions = {
  db: NodePgDatabase<typeof schema>;
};

export class ChannelVolumeService {
  private readonly db: NodePgDatabase<typeof schema>;

  constructor(options: ChannelVolumeServiceOptions) {
    this.db = options.db;
  }

  async incrementVolume({
    channelId,
    blockTimestamp,
    gasCost,
    value,
    tx,
  }: {
    channelId: bigint;
    blockTimestamp: bigint;
    gasCost: bigint;
    value: bigint;
    tx?: PgTransaction<
      PgQueryResultHKT,
      typeof schema,
      ExtractTablesWithRelations<typeof schema>
    >;
  }): Promise<void> {
    const connection = tx ?? this.db;
    const totalCost = gasCost + value;

    await connection.execute(
      sql`INSERT INTO ${schema.channelHourlyVolume} (channel_id, hour_timestamp, tx_count, gas_total, value_total, volume_total)
          VALUES (${channelId.toString()}, date_trunc('hour', to_timestamp(${blockTimestamp})), 1, ${gasCost.toString()}, ${value.toString()}, ${totalCost.toString()})
          ON CONFLICT (channel_id, hour_timestamp)
          DO UPDATE SET
            tx_count = ${schema.channelHourlyVolume}.tx_count + 1,
            gas_total = ${schema.channelHourlyVolume}.gas_total + ${gasCost.toString()}::numeric,
            value_total = ${schema.channelHourlyVolume}.value_total + ${value.toString()}::numeric,
            volume_total = ${schema.channelHourlyVolume}.volume_total + ${totalCost.toString()}::numeric`,
    );
  }
}
