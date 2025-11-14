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
  EventFromChainDbToOpenApiSchema,
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

export const ChannelCreatedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_CREATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        owner: HexSchema,
        name: z.string(),
        description: z.string(),
        hook: HexSchema.nullable(),
        metadata: MetadataArraySchema,
        chainId: z.number().int(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ChannelCreatedEventInput = z.input<
  typeof ChannelCreatedEventSchema
>;

export type ChannelCreatedEvent = z.infer<typeof ChannelCreatedEventSchema>;

// make sure the input to database schema is the same as output of the schema
// used to serialize event for database
({}) as unknown as z.input<
  typeof ChannelCreatedEventDbToOpenApiSchema
> satisfies ChannelCreatedEvent;

// make sure the output of the schema from database is the same as input to sdk
// used to deserialize event from database
({}) as unknown as z.infer<
  typeof ChannelCreatedEventDbToOpenApiSchema
> satisfies ChannelCreatedEvent;

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

export const ChannelUpdatedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_UPDATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: z.string(),
        updatedAt: z.string().datetime(),
        name: z.string(),
        description: z.string(),
        metadata: MetadataArraySchema,
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ChannelUpdatedEventInput = z.input<
  typeof ChannelUpdatedEventSchema
>;

export type ChannelUpdatedEvent = z.infer<typeof ChannelUpdatedEventSchema>;

({}) as unknown as z.input<
  typeof ChannelUpdatedEventDbToOpenApiSchema
> satisfies ChannelUpdatedEvent;

({}) as unknown as z.infer<
  typeof ChannelUpdatedEventDbToOpenApiSchema
> satisfies ChannelUpdatedEvent;

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

export const ChannelHookStatusUpdatedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_HOOK_STATUS_UPDATED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: z.string(),
        hook: HexSchema.nullable(),
        updatedAt: z.string().datetime(),
      }),
      hook: z.object({
        address: HexSchema,
        enabled: z.boolean(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ChannelHookStatusUpdatedEventInput = z.input<
  typeof ChannelHookStatusUpdatedEventSchema
>;

export type ChannelHookStatusUpdatedEvent = z.infer<
  typeof ChannelHookStatusUpdatedEventSchema
>;

({}) as unknown as z.input<
  typeof ChannelHookStatusUpdatedEventDbToOpenApiSchema
> satisfies ChannelHookStatusUpdatedEvent;

({}) as unknown as z.infer<
  typeof ChannelHookStatusUpdatedEventDbToOpenApiSchema
> satisfies ChannelHookStatusUpdatedEvent;

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

export const ChannelMetadataSetEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_METADATA_SET),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: z.string(),
        metadata: MetadataArraySchema,
        updatedAt: z.string().datetime(),
      }),
      metadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ChannelMetadataSetEventInput = z.input<
  typeof ChannelMetadataSetEventSchema
>;

export type ChannelMetadataSetEvent = z.infer<
  typeof ChannelMetadataSetEventSchema
>;

({}) as unknown as z.input<
  typeof ChannelMetadataSetEventDbToOpenApiSchema
> satisfies ChannelMetadataSetEvent;

({}) as unknown as z.infer<
  typeof ChannelMetadataSetEventDbToOpenApiSchema
> satisfies ChannelMetadataSetEvent;

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

export const ChannelTransferEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_CHANNEL_TRANSFERRED),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      channel: z.object({
        id: z.string(),
        owner: HexSchema,
        updatedAt: z.string().datetime(),
      }),
      from: HexSchema,
      to: HexSchema,
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ChannelTransferEventInput = z.input<
  typeof ChannelTransferEventSchema
>;

export type ChannelTransferEvent = z.infer<typeof ChannelTransferEventSchema>;

({}) as unknown as z.input<
  typeof ChannelTransferEventDbToOpenApiSchema
> satisfies ChannelTransferEvent;

({}) as unknown as z.infer<
  typeof ChannelTransferEventDbToOpenApiSchema
> satisfies ChannelTransferEvent;

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

/**
 * This is a list of all the channel events that are supported by the database to openapi schema converter.
 * It is used to convert the database to openapi schema.
 */
export const ChannelEventsFromDbToOpenApiSchema = [
  ChannelCreatedEventDbToOpenApiSchema,
  ChannelUpdatedEventDbToOpenApiSchema,
  ChannelHookStatusUpdatedEventDbToOpenApiSchema,
  ChannelMetadataSetEventDbToOpenApiSchema,
  ChannelTransferEventDbToOpenApiSchema,
] as const;
