import { HexSchema } from "@ecp.eth/sdk/core";
import {
  MetadataArraySchema,
  MetadataArrayOpSchema,
} from "@ecp.eth/sdk/comments/schemas";
import z from "zod";

const bigintToStringSchema = z.bigint().transform((val) => val.toString());
const dateToIsoStringSchema = z.date().transform((val) => val.toISOString());

export type MetadataArray = z.infer<typeof MetadataArraySchema>;
export type MetadataArrayOp = z.infer<typeof MetadataArrayOpSchema>;

const EventFromChainSchema = z.object({
  chainId: z.number().int(),
  blockNumber: bigintToStringSchema,
  logIndex: z.number().int(),
  txHash: HexSchema,
});

export const ChannelCreatedEventSchema = z
  .object({
    event: z.literal("channel:created"),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
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
  })
  .merge(EventFromChainSchema);

export type ChannelCreatedEventInput = z.input<
  typeof ChannelCreatedEventSchema
>;

export type ChannelCreatedEvent = z.infer<typeof ChannelCreatedEventSchema>;

export const ChannelUpdatedEventSchema = z
  .object({
    event: z.literal("channel:updated"),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      id: bigintToStringSchema,
      updatedAt: dateToIsoStringSchema,
      name: z.string(),
      description: z.string(),
      metadata: MetadataArraySchema,
    }),
  })
  .merge(EventFromChainSchema);

export type ChannelUpdatedEventInput = z.input<
  typeof ChannelUpdatedEventSchema
>;

export type ChannelUpdatedEvent = z.infer<typeof ChannelUpdatedEventSchema>;

export const ChannelHookStatusUpdatedEventSchema = z
  .object({
    event: z.literal("channel:hook:status:updated"),
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

export const ChannelMetadataSetOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("delete"),
    key: HexSchema,
  }),

  z.object({
    type: z.literal("create"),
    key: HexSchema,
    value: HexSchema,
  }),

  z.object({
    type: z.literal("update"),
    key: HexSchema,
    value: HexSchema,
  }),
]);

export type ChannelMetadataSetOperation = z.infer<
  typeof ChannelMetadataSetOperationSchema
>;

export const ChannelMetadataSetEventSchema = z
  .object({
    event: z.literal("channel:metadata:set"),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: bigintToStringSchema,
        metadata: MetadataArraySchema,
        updatedAt: dateToIsoStringSchema,
      }),
      metadataOperation: ChannelMetadataSetOperationSchema,
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
    event: z.literal("channel:transfer"),
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
