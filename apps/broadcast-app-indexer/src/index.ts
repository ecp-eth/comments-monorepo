import "./sentry";
import * as Sentry from "@sentry/node";
import { schema } from "../schema";
import { ponder } from "ponder:registry";
import { db } from "./services/db";
import { and, eq } from "drizzle-orm";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { notificationService } from "./services";
import { env } from "./env";

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
  const { commentId, channelId, parentId } = event.args;

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

  const subscribers = await db.query.channelSubscription.findMany({
    columns: {
      userFid: true,
    },
    where: and(
      eq(schema.channelSubscription.channelId, channelId),
      eq(schema.channelSubscription.notificationsEnabled, true),
    ),
  });

  const targetUrl = new URL(
    `/channels/${channel.id}`,
    env.BROADCAST_APP_MINI_APP_URL,
  ).toString();

  await notificationService.notify(
    subscribers.map((s) => s.userFid),
    commentId,
    {
      title: `New comment in channel`,
      body: `Something new was posted in the channel you are subscribed to.`,
      targetUrl,
    },
  );
});
