import { setDatabaseSchema } from "@ponder/client";
import { relations } from "drizzle-orm";
import { env } from "./src/env";
import * as onchainSchema from "./ponder.schema";
import * as offchainSchema from "./schema.offchain";

setDatabaseSchema(onchainSchema, env.DATABASE_SCHEMA);

const subscriptionRelations = relations(
  offchainSchema.channelSubscription,
  ({ one }) => ({
    channel: one(onchainSchema.channel, {
      fields: [offchainSchema.channelSubscription.channelId],
      references: [onchainSchema.channel.id],
    }),
  }),
);

const channelRelations = relations(onchainSchema.channel, ({ many }) => ({
  subscriptions: many(offchainSchema.channelSubscription),
}));

export const schema = {
  ...onchainSchema,
  ...offchainSchema,
  subscriptionRelations,
  channelRelations,
};
