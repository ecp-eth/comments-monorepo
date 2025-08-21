import "./sentry";
import * as Sentry from "@sentry/node";
import { schema } from "../schema";
import { ponder } from "ponder:registry";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { db, notificationService } from "./services";
import { Hex, hexToBigInt, hexToNumber, hexToString, sliceHex } from "viem";
import { AssetId } from "caip";
import { decodeListStorageLocation } from "@ecp.eth/shared/ethereum-follow-protocol";
import { isSameHex } from "@ecp.eth/shared/helpers";
import {
  efpAccountMetadataAbi,
  efpListRegistryAbi,
} from "./abi/generated/efp-abi";
import { env } from "./env";
import { and, eq } from "drizzle-orm";

function isChain(chain: unknown): chain is { id: number } {
  if (!chain || typeof chain !== "object") {
    return false;
  }

  if (!("id" in chain) || typeof chain.id !== "number") {
    return false;
  }

  return true;
}

ponder.on("BroadcastHook:ChannelCreated", async ({ event, context }) => {
  const channelEvent = event.args;

  // Convert block timestamp to Date
  const createdAt = new Date(Number(event.block.timestamp) * 1000);

  if (!isChain(context.chain)) {
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

    throw error;
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

ponder.on("EFPListRecords:ListOp", async ({ event, context }) => {
  if (!isChain(context.chain)) {
    Sentry.captureMessage("Channel created event received with invalid chain", {
      level: "error",
      extra: {
        event,
      },
    });

    return;
  }

  const chainId = context.chain.id;
  const version = hexToNumber(sliceHex(event.args.op, 0, 1), { size: 1 });
  const opcode = hexToNumber(sliceHex(event.args.op, 1, 2), { size: 1 });
  const data = sliceHex(event.args.op, 2);

  if (version !== 1) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Skipping list op because it's not a v1 list op", {
        version,
      });
    }

    return;
  }

  if (opcode !== 1 && opcode !== 2) {
    if (process.env.NODE_ENV !== "production") {
      console.info("Skipping list op because it's not a create or update", {
        opcode,
      });
    }

    return;
  }

  const recordVersion = hexToNumber(sliceHex(data, 0, 1), { size: 1 });
  const recordType = hexToNumber(sliceHex(data, 1, 2), { size: 1 });
  const recordData = hexToString(sliceHex(data, 2));

  if (recordType !== 0x80 && recordType !== 0x80) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        "Skipping list operation because it doesn't contain recognized record type",
        {
          recordType,
          recordVersion,
          data,
        },
      );
    }

    return;
  }

  try {
    const assetId = AssetId.parse(recordData);

    if (typeof assetId.assetName !== "object") {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "Skipping list operation because it doesn't contain valid asset id, it probably isn't ERC721 record",
          {
            recordData,
          },
        );
      }

      return;
    }

    if (
      assetId.assetName.namespace !== "erc721" ||
      !isSameHex(
        assetId.assetName.reference as Hex,
        context.contracts.ChannelManager.address as Hex,
      )
    ) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "Skipping list operation because it doesn't contain EFP ERC721 record",
          {
            recordData,
          },
        );
      }

      return;
    }

    const listUserAddress = await context.client.readContract({
      abi: context.contracts.EFPListRecords.abi,
      address: context.contracts.EFPListRecords.address,
      functionName: "getListUser",
      args: [event.args.slot],
    });

    const primaryListTokenId = await context.client.readContract({
      abi: efpAccountMetadataAbi,
      address: env.EFP_ACCOUNT_METADATA_ADDRESS,
      functionName: "getValue",
      args: [listUserAddress, "primary-list"],
    });

    if (isZeroHex(primaryListTokenId)) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "Skipping list operation because the list user doesn't have a primary list",
          {
            listUser: listUserAddress,
          },
        );
      }

      return;
    }

    const listStorageLocation = await context.client.readContract({
      abi: efpListRegistryAbi,
      address: env.EFP_LIST_REGISTRY_ADDRESS,
      functionName: "getListStorageLocation",
      args: [hexToBigInt(primaryListTokenId)],
    });

    const decodedListStorageLocation =
      decodeListStorageLocation(listStorageLocation);

    const isPrimary =
      isSameHex(decodedListStorageLocation.recordsAddress, event.log.address) &&
      decodedListStorageLocation.chainId ===
        BigInt(env.CHAIN_ANVIL_EFP_OVERRIDE_CHAIN_ID ?? chainId ?? 0) &&
      decodedListStorageLocation.slot === event.args.slot;

    if (!isPrimary) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "Skipping list operation because it's not a primary list",
          {
            listStorageLocation,
            decodedListStorageLocation,
          },
        );
      }

      return;
    }

    const channelId = BigInt(assetId.tokenId);

    if (opcode === 1) {
      await db.transaction(async (tx) => {
        await tx.insert(schema.channelSubscription).values({
          channelId,
          chainId,
          userAddress: listUserAddress,
          createdAt: new Date(Number(event.block.timestamp) * 1000),
          updatedAt: new Date(Number(event.block.timestamp) * 1000),
          txHash: event.transaction.hash,
          logIndex: event.log.logIndex,
        });

        // create farcaster notification settings for the channel
        const userFarcasterMiniAppSettings =
          await tx.query.userFarcasterMiniAppSettings.findMany({
            where(fields, operators) {
              return operators.eq(fields.userAddress, listUserAddress);
            },
          });

        if (userFarcasterMiniAppSettings.length > 0) {
          await tx
            .insert(schema.channelSubscriptionFarcasterNotificationSettings)
            .values(
              userFarcasterMiniAppSettings.map((settings) => {
                return {
                  appId: settings.appId,
                  clientFid: settings.clientFid,
                  channelId: BigInt(assetId.tokenId),
                  userAddress: listUserAddress,
                  userFid: settings.userFid,
                  notificationsEnabled: settings.notificationsEnabled,
                };
              }),
            )
            .execute();
        }
      });
    } else if (opcode === 2) {
      await db.transaction(async (tx) => {
        await tx
          .delete(schema.channelSubscription)
          .where(
            and(
              eq(schema.channelSubscription.channelId, channelId),
              eq(schema.channelSubscription.userAddress, listUserAddress),
            ),
          );

        // delete farcaster notification settings for the channel
        await tx
          .delete(schema.channelSubscriptionFarcasterNotificationSettings)
          .where(
            and(
              eq(
                schema.channelSubscriptionFarcasterNotificationSettings
                  .channelId,
                channelId,
              ),
              eq(
                schema.channelSubscriptionFarcasterNotificationSettings
                  .userAddress,
                listUserAddress,
              ),
            ),
          );
      });
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Invalid CAIP")) {
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "Skipping list operation because it doesn't contain valid asset id, it probably isn't ERC721 record",
          {
            recordData,
          },
        );
      }

      return;
    }

    return;
  }
});
