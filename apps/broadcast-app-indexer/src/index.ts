import "./sentry";
import * as Sentry from "@sentry/node";
import schema from "ponder:schema";
import { ponder } from "ponder:registry";

ponder.on("BroadcastHook:ChannelCreated", async ({ event, context }) => {
  const channelEvent = event.args;

  // Convert block timestamp to Date
  const createdAt = new Date(Number(event.block.timestamp) * 1000);

  if (!context.chain) {
    Sentry.captureMessage(
      "Channel created event received without chain context",
      {
        level: "error",
        extra: {
          event,
        },
      },
    );
    return;
  }

  if (typeof context.chain.id !== "number") {
    Sentry.captureMessage(
      "Channel created event received with invalid chain ID",
      {
        level: "error",
        extra: {
          event,
          chainId: context.chain.id,
        },
      },
    );
    return;
  }

  await context.db.insert(schema.channel).values({
    id: channelEvent.channelId,
    chainId: context.chain.id,
    createdAt: createdAt,
    updatedAt: createdAt,
    owner: channelEvent.creator,
    name: channelEvent.name,
    description: channelEvent.description,
    metadata: channelEvent.metadata.slice(),
    txHash: event.transaction.hash,
    logIndex: event.log.logIndex,
  });
});

ponder.on("ChannelManager:Transfer", async ({ event, context }) => {
  const { to, tokenId: channelId } = event.args;

  await context.db
    .update(schema.channel, {
      id: channelId,
    })
    .set({
      owner: to,
      updatedAt: new Date(Number(event.block.timestamp) * 1000),
    });
});

ponder.on("ChannelManager:ChannelUpdated", async ({ event, context }) => {
  const { channelId, description, name, metadata } = event.args;

  await context.db.update(schema.channel, { id: channelId }).set({
    name,
    description,
    metadata: metadata.slice(),
    updatedAt: new Date(Number(event.block.timestamp) * 1000),
  });
});

ponder.on("CommentManager:CommentAdded", async ({ event, context }) => {
  /**
   * 1. Check if the comment belongs to a channel we know
   * 2. Check if the comment is top level
   * 3. Check if we notified people about this comment
   * 4. Notify people about the comment
   */
});
