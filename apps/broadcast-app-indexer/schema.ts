import { relations, setDatabaseSchema } from "@ponder/client";
import { env } from "./src/env";
import * as onchainSchema from "./ponder.schema";
import * as offchainSchema from "./schema.offchain";

setDatabaseSchema(onchainSchema, env.DATABASE_SCHEMA);

export const onchainChannelRelations = relations(
  onchainSchema.channel,
  ({ many }) => ({
    subscriptions: many(onchainSchema.channelSubscription),
  }),
);

export const onchainChannelSubscriptionRelations = relations(
  onchainSchema.channelSubscription,
  ({ one, many }) => ({
    channel: one(onchainSchema.channel, {
      fields: [onchainSchema.channelSubscription.channelId],
      references: [onchainSchema.channel.id],
    }),
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
  onchainChannelRelations,
  onchainChannelSubscriptionRelations,
  offchainChannelSubscriptionFarcasterNotificationSettingsRelations,
};
