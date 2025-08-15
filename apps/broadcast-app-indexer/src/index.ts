import "./sentry";
import * as Sentry from "@sentry/node";
import { schema } from "../schema";
import { ponder } from "ponder:registry";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { notificationService } from "./services";

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

  try {
    await context.db
      .update(schema.channel, {
        id: channelId,
      })
      .set({
        owner: to,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
      });
  } catch (error) {
    if (error instanceof Error && error.name === "RecordNotFoundError") {
      console.warn(
        "Failed to update channel owner because it was not found. Probably not created by BroaadcastHook",
        {
          channelId,
        },
      );

      return;
    }

    throw error;
  }
});

ponder.on("ChannelManager:ChannelUpdated", async ({ event, context }) => {
  const { channelId, description, name, metadata } = event.args;

  try {
    await context.db.update(schema.channel, { id: channelId }).set({
      name,
      description,
      metadata: metadata.slice(),
      updatedAt: new Date(Number(event.block.timestamp) * 1000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "RecordNotFoundError") {
      console.warn(
        "Failed to update channel because it was not found. Probably not created by BroaadcastHook",
        {
          channelId,
        },
      );

      return;
    }

    throw WebTransportError;
  }
});

ponder.on("CommentManager:CommentAdded", async ({ event, context }) => {
  const { channelId, parentId } = event.args;

  if (!isZeroHex(parentId)) {
    // this is not a top level comment
    return;
  }

  const channel = await context.db.find(schema.channel, {
    id: channelId,
  });

  if (!channel) {
    // this comment doesn't belong to a channel we know
    return;
  }

  await notificationService.notify({
    comment: event.args,
    channel,
  });
});
