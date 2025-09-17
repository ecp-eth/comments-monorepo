import { HexSchema } from "@ecp.eth/sdk/core";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments/schemas";
import {
  EVENT_CHANNEL_CREATED,
  EVENT_CHANNEL_UPDATED,
  EVENT_CHANNEL_HOOK_STATUS_UPDATED,
  EVENT_CHANNEL_METADATA_SET,
  EVENT_CHANNEL_TRANSFERRED,
  type ChannelCreatedEventSchema as OutputChannelCreatedEventSchema,
  type ChannelUpdatedEventSchema as OutputChannelUpdatedEventSchema,
  type ChannelHookStatusUpdatedEventSchema as OutputChannelHookStatusUpdatedEventSchema,
  type ChannelMetadataSetEventSchema as OutputChannelMetadataSetEventSchema,
  type ChannelTransferredEventSchema as OutputChannelTransferredEventSchema,
  type ChannelEvents as SDKChannelEvents,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";
import z from "zod";
import {
  bigintToStringSchema,
  dateToIsoStringSchema,
  EventFromChainSchema,
  MetadataSetOperationSchema,
} from "../shared/schemas.ts";

export const ChannelEvents = [
  EVENT_CHANNEL_CREATED,
  EVENT_CHANNEL_UPDATED,
  EVENT_CHANNEL_HOOK_STATUS_UPDATED,
  EVENT_CHANNEL_METADATA_SET,
  EVENT_CHANNEL_TRANSFERRED,
] as const;

export type ChannelEvent = (typeof ChannelEvents)[number];

export const ChannelCreatedEventSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_CREATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        createdAt: dateToIsoStringSchema,
        updatedAt: dateToIsoStringSchema,
        owner: HexSchema,
        name: z.string(),
        description: z.string(),
        hook: HexSchema.nullable(),
        metadata: MetadataArraySchema,
        chainId: z.number().int(),
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelCreatedEventInput = z.input<
  typeof ChannelCreatedEventSchema
>;

export type ChannelCreatedEvent = z.infer<typeof ChannelCreatedEventSchema>;

export const ChannelUpdatedEventSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_UPDATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        updatedAt: dateToIsoStringSchema,
        name: z.string(),
        description: z.string(),
        metadata: MetadataArraySchema,
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelUpdatedEventInput = z.input<
  typeof ChannelUpdatedEventSchema
>;

export type ChannelUpdatedEvent = z.infer<typeof ChannelUpdatedEventSchema>;

export const ChannelHookStatusUpdatedEventSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_HOOK_STATUS_UPDATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        hook: HexSchema.nullable(),
        updatedAt: dateToIsoStringSchema,
      }),
      hook: z.object({
        address: HexSchema,
        enabled: z.boolean(),
      }),
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelHookStatusUpdatedEventInput = z.input<
  typeof ChannelHookStatusUpdatedEventSchema
>;

export type ChannelHookStatusUpdatedEvent = z.infer<
  typeof ChannelHookStatusUpdatedEventSchema
>;

export const ChannelMetadataSetEventSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_METADATA_SET),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        metadata: MetadataArraySchema,
        updatedAt: dateToIsoStringSchema,
      }),
      metadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelMetadataSetEventInput = z.input<
  typeof ChannelMetadataSetEventSchema
>;

export type ChannelMetadataSetEvent = z.infer<
  typeof ChannelMetadataSetEventSchema
>;

export const ChannelTransferEventSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_TRANSFERRED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        owner: HexSchema,
        updatedAt: dateToIsoStringSchema,
      }),
      from: HexSchema,
      to: HexSchema,
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelTransferEventInput = z.input<
  typeof ChannelTransferEventSchema
>;

export type ChannelTransferEvent = z.infer<typeof ChannelTransferEventSchema>;

// assert that the schema output is the same as input to sdk
({}) as unknown as ChannelCreatedEvent satisfies z.input<
  typeof OutputChannelCreatedEventSchema
>;
({}) as unknown as ChannelUpdatedEvent satisfies z.input<
  typeof OutputChannelUpdatedEventSchema
>;
({}) as unknown as ChannelHookStatusUpdatedEvent satisfies z.input<
  typeof OutputChannelHookStatusUpdatedEventSchema
>;
({}) as unknown as ChannelMetadataSetEvent satisfies z.input<
  typeof OutputChannelMetadataSetEventSchema
>;
({}) as unknown as ChannelTransferEvent satisfies z.input<
  typeof OutputChannelTransferredEventSchema
>;
({}) as unknown as typeof SDKChannelEvents satisfies typeof ChannelEvents;
