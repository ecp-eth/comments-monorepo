import * as Sentry from "@sentry/node";
import {
  type IndexingFunctionArgs,
  type ponder as Ponder,
} from "ponder:registry";
import { ZERO_ADDRESS } from "@ecp.eth/sdk";
import { schema } from "../../schema.ts";
import { db, eventOutboxService } from "../services/index.ts";
import {
  ponderEventToCreateChannelEvent,
  ponderEventToUpdateChannelEvent,
  ponderEventToUpdateChannelHookStatusEvent,
  ponderEventToUpdateChannelMetadataEvent,
  ponderEventToUpdateChannelTransferEvent,
} from "../events/channel/index.ts";
import { eq, sql } from "drizzle-orm";
import type { MetadataSetOperation } from "../events/shared/schemas.ts";
import { wrapServiceWithTracing } from "../telemetry.ts";

async function channelCreatedHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelCreated">) {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.channel)
      .values({
        createdAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        owner: event.args.owner,
        id: event.args.channelId,
        name: event.args.name,
        description: event.args.description,
        hook: event.args.hook === ZERO_ADDRESS ? null : event.args.hook,
        metadata: event.args.metadata.slice(),
        chainId: context.chain.id,
      })
      .execute();

    await eventOutboxService.publishEvent({
      event: ponderEventToCreateChannelEvent({
        event,
        context,
      }),
      aggregateId: event.args.channelId.toString(),
      aggregateType: "channel",
      tx,
    });
  });
}

async function channelUpdatedHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelUpdated">) {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.channel)
      .set({
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
        name: event.args.name,
        description: event.args.description,
        metadata: event.args.metadata.slice(),
      })
      .where(eq(schema.channel.id, event.args.channelId))
      .execute();

    await eventOutboxService.publishEvent({
      event: ponderEventToUpdateChannelEvent({
        event,
        context,
      }),
      aggregateId: event.args.channelId.toString(),
      aggregateType: "channel",
      tx,
    });
  });
}

async function channelHookStatusUpdatedHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:HookStatusUpdated">) {
  await db.transaction(async (tx) => {
    await tx
      .update(schema.channel)
      .set({
        hook: event.args.enabled ? event.args.hook : null,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
      })
      .where(eq(schema.channel.id, event.args.channelId))
      .execute();

    await eventOutboxService.publishEvent({
      event: ponderEventToUpdateChannelHookStatusEvent({
        event,
        context,
      }),
      aggregateId: event.args.channelId.toString(),
      aggregateType: "channel",
      tx,
    });
  });
}

async function channelMetadataSetHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelMetadataSet">) {
  await db.transaction(async (tx) => {
    const channel = await tx.query.channel.findFirst({
      where: eq(schema.channel.id, event.args.channelId),
    });

    if (!channel) {
      Sentry.captureMessage(
        `Channel not found for channelId: ${event.args.channelId}`,
        {
          level: "warning",
          extra: {
            channelId: event.args.channelId,
          },
        },
      );
      return;
    }

    let metadata = channel.metadata;
    let metadataOperation: MetadataSetOperation;

    if (event.args.value === "0x") {
      // delete the key from metadata
      metadata = channel.metadata.filter(
        (metadata) => metadata.key !== event.args.key,
      );

      metadataOperation = {
        type: "delete",
        key: event.args.key,
      };
    } else {
      // update / add the key to metadata
      const metadataEntry = metadata.find(
        (metadata) => metadata.key === event.args.key,
      );

      if (metadataEntry) {
        metadataEntry.value = event.args.value;

        metadataOperation = {
          type: "update",
          key: event.args.key,
          value: event.args.value,
        };
      } else {
        metadata.push({
          key: event.args.key,
          value: event.args.value,
        });

        metadataOperation = {
          type: "create",
          key: event.args.key,
          value: event.args.value,
        };
      }
    }

    await tx
      .update(schema.channel)
      .set({
        metadata,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
      })
      .where(eq(schema.channel.id, event.args.channelId))
      .execute();

    await eventOutboxService.publishEvent({
      event: ponderEventToUpdateChannelMetadataEvent({
        event,
        context,
        metadata,
        metadataOperation,
      }),
      aggregateId: event.args.channelId.toString(),
      aggregateType: "channel",
      tx,
    });
  });
}

async function channelTransferHandler({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:Transfer">) {
  await db.transaction(async (tx) => {
    const channel = await tx.query.channel.findFirst({
      where: eq(schema.channel.id, event.args.tokenId),
    });

    if (!channel) {
      Sentry.captureMessage(
        `Channel not found when transferring ownership (probably freshly created channel)`,
        {
          level: "warning",
          extra: {
            tokenId: event.args.tokenId,
          },
        },
      );

      return;
    }

    await tx
      .update(schema.channel)
      .set({
        owner: event.args.to,
        updatedAt: sql`to_timestamp(${event.block.timestamp})::timestamptz`,
      })
      .where(eq(schema.channel.id, event.args.tokenId))
      .execute();

    await eventOutboxService.publishEvent({
      event: ponderEventToUpdateChannelTransferEvent({
        event,
        context,
      }),
      aggregateId: event.args.tokenId.toString(),
      aggregateType: "channel",
      tx,
    });
  });
}

export function initializeChannelEventsIndexing(ponder: typeof Ponder) {
  ponder.on(
    "CommentsV1ChannelManager:ChannelCreated",
    wrapServiceWithTracing(channelCreatedHandler),
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelUpdated",
    wrapServiceWithTracing(channelUpdatedHandler),
  );

  ponder.on(
    "CommentsV1ChannelManager:HookStatusUpdated",
    wrapServiceWithTracing(channelHookStatusUpdatedHandler),
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelMetadataSet",
    wrapServiceWithTracing(channelMetadataSetHandler),
  );

  ponder.on(
    "CommentsV1ChannelManager:Transfer",
    wrapServiceWithTracing(channelTransferHandler),
  );
}
