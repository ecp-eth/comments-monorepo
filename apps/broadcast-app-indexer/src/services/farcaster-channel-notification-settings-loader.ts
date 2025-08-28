import DataLoader from "dataloader";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema";
import type { Hex } from "viem";
import { sql } from "drizzle-orm";

type FarcasterChannelNotificationSettingsLoaderOptions = {
  db: NodePgDatabase<typeof schema>;
};

type KeyObject = { channelId: bigint; appId: string; userAddress: Hex };

export class FarcasterChannelNotificationSettingsLoader extends DataLoader<
  KeyObject,
  Record<number, boolean>,
  string
> {
  constructor({ db }: FarcasterChannelNotificationSettingsLoaderOptions) {
    super(
      async (conditions) => {
        const results =
          await db.query.channelSubscriptionFarcasterNotificationSettings.findMany(
            {
              where(fields, operators) {
                const columns = sql.join(
                  [fields.appId, fields.channelId, fields.userAddress],
                  sql`,`,
                );
                const values = sql.join(
                  conditions.map((condition) => {
                    return sql`(${condition.appId}, ${condition.channelId}, ${condition.userAddress})`;
                  }),
                  sql`, `,
                );

                return operators.sql`
                (${columns}) IN (${values})
              `;
              },
            },
          );

        const resultMap = new Map<string, Record<number, boolean>>();

        for (const row of results) {
          const key = createKey({
            appId: row.appId,
            channelId: row.channelId,
            userAddress: row.userAddress,
          });

          const clientSettingsForKey = resultMap.get(key) || {};

          clientSettingsForKey[row.clientFid] = row.notificationsEnabled;

          resultMap.set(key, clientSettingsForKey);
        }

        return conditions.map((condition) => {
          return resultMap.get(createKey(condition)) || {};
        });
      },
      {
        cacheKeyFn: createKey,
        cache: false,
      },
    );
  }
}

function createKey(obj: KeyObject): string {
  return `${obj.channelId}:${obj.appId}:${obj.userAddress}`.toLowerCase();
}
