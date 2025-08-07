import * as Sentry from "@sentry/node";
import { ponder as Ponder } from "ponder:registry";
import schema from "ponder:schema";
import { ZERO_ADDRESS } from "@ecp.eth/sdk";

export function initializeChannelEventsIndexing(ponder: typeof Ponder) {
  ponder.on(
    "CommentsV1ChannelManager:ChannelCreated",
    async ({ event, context }) => {
      const createdAt = new Date(Number(event.block.timestamp) * 1000);
      const updatedAt = new Date(Number(event.block.timestamp) * 1000);

      await context.db.insert(schema.channel).values({
        createdAt,
        updatedAt,
        owner: event.args.owner,
        id: event.args.channelId,
        name: event.args.name,
        description: event.args.description,
        hook: event.args.hook === ZERO_ADDRESS ? null : event.args.hook,
        metadata: event.args.metadata.slice(),
        chainId: context.chain.id,
      });
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelUpdated",
    async ({ event, context }) => {
      await context.db
        .update(schema.channel, {
          id: event.args.channelId,
        })
        .set({
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
          name: event.args.name,
          description: event.args.description,
          metadata: event.args.metadata.slice(),
        });
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:HookStatusUpdated",
    async ({ event, context }) => {
      await context.db
        .update(schema.channel, {
          id: event.args.channelId,
        })
        .set({
          hook: event.args.enabled ? event.args.hook : null,
        });
    },
  );

  ponder.on(
    "CommentsV1ChannelManager:ChannelMetadataSet",
    async ({ event, context }) => {
      const channel = await context.db.find(schema.channel, {
        id: event.args.channelId,
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

      if (event.args.value === "0x") {
        // delete the key from metadata
        metadata = channel.metadata.filter(
          (metadata) => metadata.key !== event.args.key,
        );
      } else {
        // update / add the key to metadata
        const metadataEntry = metadata.find(
          (metadata) => metadata.key === event.args.key,
        );

        if (metadataEntry) {
          metadataEntry.value = event.args.value;
        } else {
          metadata.push({
            key: event.args.key,
            value: event.args.value,
          });
        }
      }

      await context.db
        .update(schema.channel, {
          id: event.args.channelId,
        })
        .set({
          metadata,
        });
    },
  );

  ponder.on("CommentsV1ChannelManager:Transfer", async ({ event, context }) => {
    const channel = await context.db.find(schema.channel, {
      id: event.args.tokenId,
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

    await context.db
      .update(schema.channel, {
        id: event.args.tokenId,
      })
      .set({
        owner: event.args.to,
      });
  });
}
