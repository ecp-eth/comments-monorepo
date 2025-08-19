import { relations, setDatabaseSchema } from "@ponder/client";
import { env } from "./src/env";
import * as onchainSchema from "./ponder.schema";
import * as offchainSchema from "./schema.offchain";

setDatabaseSchema(onchainSchema, env.DATABASE_SCHEMA);

const channelSubscriptionRelations = relations(
  onchainSchema.channelSubscription,
  ({ many }) => ({
    farcasterNotificationSettings: many(
      offchainSchema.channelSubscriptionFarcasterNotificationSettings,
    ),
  }),
);

const channelSubscriptionFarcasterNotificationSettingsRelations = relations(
  offchainSchema.channelSubscriptionFarcasterNotificationSettings,
  ({ one }) => ({
    channelSubscription: one(onchainSchema.channelSubscription, {
      fields: [
        offchainSchema.channelSubscriptionFarcasterNotificationSettings
          .channelId,
      ],
      references: [onchainSchema.channelSubscription.channelId],
    }),
  }),
);

export const schema = {
  ...onchainSchema,
  ...offchainSchema,
  channelSubscriptionRelations,
  channelSubscriptionFarcasterNotificationSettingsRelations,
};
