import * as Sentry from "@sentry/node";
import { type ponder as Ponder } from "ponder:registry";
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
import { eq } from "drizzle-orm";
import type { MetadataSetOperation } from "../events/shared/schemas.ts";

export function initializeChannelEventsIndexing(ponder: typeof Ponder) {
  ponder.on(
    "CommentsV1ChannelManager:ChannelCreated",
    async ({ event, context }) => {
      const createdAt = new Date(Number(event.block.timestamp) * 1000);
      const updatedAt = new Date(Number(event.block.timestamp) * 1000);

      await db.transaction(async (tx) => {
        await tx
          .insert(schema.channel)
          .values({
            createdAt,
            updatedAt,
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
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelUpdated",
    async ({ event, context }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.channel)
          .set({
            updatedAt: new Date(Number(event.block.timestamp) * 1000),
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
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:HookStatusUpdated",
    async ({ event, context }) => {
      await db.transaction(async (tx) => {
        await tx
          .update(schema.channel)
          .set({
            hook: event.args.enabled ? event.args.hook : null,
            updatedAt: new Date(Number(event.block.timestamp) * 1000),
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
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelMetadataSet",
    async ({ event, context }) => {
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
            updatedAt: new Date(Number(event.block.timestamp) * 1000),
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
    },
  );

  ponder.on("CommentsV1ChannelManager:Transfer", async ({ event, context }) => {
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
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
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
  });
}
