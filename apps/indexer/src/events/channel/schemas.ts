import { HexSchema } from "@ecp.eth/sdk/core";
import { MetadataArraySchema } from "@ecp.eth/sdk/comments/schemas";
import z from "zod";
import {
  bigintToStringSchema,
  dateToIsoStringSchema,
  EventFromChainSchema,
  MetadataSetOperationSchema,
} from "../shared/schemas.ts";

export const ChannelEvents = [
  "channel:created",
  "channel:updated",
  "channel:hook:status:updated",
  "channel:metadata:set",
  "channel:transfer",
] as const;

export type ChannelEvent = (typeof ChannelEvents)[number];

export const ChannelCreatedEventSchema = z
  .object({
    event: z.literal("channel:created" satisfies ChannelEvent),
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
    event: z.literal("channel:updated" satisfies ChannelEvent),
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
    event: z.literal("channel:hook:status:updated" satisfies ChannelEvent),
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
    event: z.literal("channel:metadata:set" satisfies ChannelEvent),
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
    event: z.literal("channel:transfer" satisfies ChannelEvent),
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
