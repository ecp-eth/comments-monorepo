import type { IndexingFunctionArgs } from "ponder:registry";
import { ZERO_ADDRESS } from "@ecp.eth/sdk";
import {
  type ChannelCreatedEventInput,
  ChannelCreatedEventSchema,
  type ChannelCreatedEvent,
  type ChannelUpdatedEventInput,
  ChannelUpdatedEventSchema,
  type ChannelUpdatedEvent,
  type ChannelHookStatusUpdatedEvent,
  ChannelHookStatusUpdatedEventSchema,
  type ChannelHookStatusUpdatedEventInput,
  type ChannelMetadataSetEvent,
  ChannelMetadataSetEventSchema,
  type ChannelMetadataSetEventInput,
  type MetadataArray,
  type ChannelMetadataSetOperation,
  type ChannelTransferEvent,
  ChannelTransferEventSchema,
  type ChannelTransferEventInput,
} from "./schemas";

export function ponderEventToCreateChannelEvent({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelCreated">): ChannelCreatedEvent {
  const uid = `channel:created:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.channelId}`;

  return ChannelCreatedEventSchema.parse({
    event: "channel:created",
    version: 1,
    uid,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      id: event.args.channelId,
      createdAt: new Date(Number(event.block.timestamp) * 1000),
      updatedAt: new Date(Number(event.block.timestamp) * 1000),
      owner: event.args.owner,
      name: event.args.name,
      description: event.args.description,
      hook: event.args.hook === ZERO_ADDRESS ? null : event.args.hook,
      metadata: event.args.metadata.slice(),
      chainId: context.chain.id,
    },
  } satisfies ChannelCreatedEventInput);
}

export function ponderEventToUpdateChannelEvent({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelUpdated">): ChannelUpdatedEvent {
  const uid = `channel:updated:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.channelId}`;

  return ChannelUpdatedEventSchema.parse({
    event: "channel:updated",
    version: 1,
    uid,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      id: event.args.channelId,
      updatedAt: new Date(Number(event.block.timestamp) * 1000),
      name: event.args.name,
      description: event.args.description,
      metadata: event.args.metadata.slice(),
    },
  } satisfies ChannelUpdatedEventInput);
}

export function ponderEventToUpdateChannelHookStatusEvent({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:HookStatusUpdated">): ChannelHookStatusUpdatedEvent {
  const uid = `channel:hook:status:updated:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.channelId}`;

  return ChannelHookStatusUpdatedEventSchema.parse({
    event: "channel:hook:status:updated",
    version: 1,
    uid,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      channel: {
        id: event.args.channelId,
        hook: event.args.enabled ? event.args.hook : null,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
      },
      hook: {
        address: event.args.hook,
        enabled: event.args.enabled,
      },
    },
  } satisfies ChannelHookStatusUpdatedEventInput);
}

export function ponderEventToUpdateChannelMetadataEvent({
  event,
  context,
  metadata,
  metadataOperation,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:ChannelMetadataSet"> & {
  metadata: MetadataArray;
  metadataOperation: ChannelMetadataSetOperation;
}): ChannelMetadataSetEvent {
  const uid = `channel:metadata:set:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.channelId}`;

  return ChannelMetadataSetEventSchema.parse({
    event: "channel:metadata:set",
    version: 1,
    uid,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      channel: {
        id: event.args.channelId,
        metadata,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
      },
      metadataOperation,
    },
  } satisfies ChannelMetadataSetEventInput);
}

export function ponderEventToUpdateChannelTransferEvent({
  event,
  context,
}: IndexingFunctionArgs<"CommentsV1ChannelManager:Transfer">): ChannelTransferEvent {
  const uid = `channel:transfer:${context.chain.id}:${event.block.number}:${event.transaction.hash}:${event.log.logIndex}:${event.args.tokenId}`;

  return ChannelTransferEventSchema.parse({
    event: "channel:transfer",
    version: 1,
    uid,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash: event.transaction.hash,
    chainId: context.chain.id,
    data: {
      channel: {
        id: event.args.tokenId,
        owner: event.args.from,
        updatedAt: new Date(Number(event.block.timestamp) * 1000),
      },
      from: event.args.from,
      to: event.args.to,
    },
  } satisfies ChannelTransferEventInput);
}
