import { relations, setDatabaseSchema } from "@ponder/client";
import { env } from "./src/env";
import * as onchainSchema from "./ponder.schema";
import * as offchainSchema from "./schema.offchain";

setDatabaseSchema(onchainSchema, env.DATABASE_SCHEMA);

const onchainChannelSubscriptionRelations = relations(
  onchainSchema.channelSubscription,
  ({ many }) => ({
    farcasterNotificationSettings: many(
      offchainSchema.channelSubscriptionFarcasterNotificationSettings,
    ),
  }),
);

const offchainChannelSubscriptionFarcasterNotificationSettingsRelations =
  relations(
    offchainSchema.channelSubscriptionFarcasterNotificationSettings,
    ({ one }) => ({
      channelSubscription: one(onchainSchema.channelSubscription, {
        fields: [
          offchainSchema.channelSubscriptionFarcasterNotificationSettings
            .channelId,
          offchainSchema.channelSubscriptionFarcasterNotificationSettings
            .userAddress,
        ],
        references: [
          onchainSchema.channelSubscription.channelId,
          onchainSchema.channelSubscription.userAddress,
        ],
      }),
      userFarcasterMiniAppSettings: one(
        offchainSchema.userFarcasterMiniAppSettings,
        {
          fields: [
            offchainSchema.channelSubscriptionFarcasterNotificationSettings
              .appId,
            offchainSchema.channelSubscriptionFarcasterNotificationSettings
              .clientFid,
            offchainSchema.channelSubscriptionFarcasterNotificationSettings
              .userAddress,
            offchainSchema.channelSubscriptionFarcasterNotificationSettings
              .userFid,
          ],
          references: [
            offchainSchema.userFarcasterMiniAppSettings.appId,
            offchainSchema.userFarcasterMiniAppSettings.clientFid,
            offchainSchema.userFarcasterMiniAppSettings.userAddress,
            offchainSchema.userFarcasterMiniAppSettings.userFid,
          ],
        },
      ),
    }),
  );

export const schema = {
  ...onchainSchema,
  ...offchainSchema,
  onchainChannelSubscriptionRelations,
  offchainChannelSubscriptionFarcasterNotificationSettingsRelations,
};
