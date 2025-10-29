import { z } from "zod";
import { HexSchema } from "../../../core/schemas.js";
import { MetadataArraySchema } from "../../../comments/schemas.js";
import {
  EventFromChainSchema,
  EventV1Schema,
  ISO8601DateSchema,
  MetadataSetOperationSchema,
  StringBigintSchema,
} from "./shared.js";

export const EVENT_CHANNEL_CREATED = "channel:created" as const;
export const EVENT_CHANNEL_UPDATED = "channel:updated" as const;
export const EVENT_CHANNEL_HOOK_STATUS_UPDATED =
  "channel:hook:status:updated" as const;
export const EVENT_CHANNEL_METADATA_SET = "channel:metadata:set" as const;
export const EVENT_CHANNEL_TRANSFERRED = "channel:transferred" as const;

/**
 * Channel events.
 */
export const ChannelEvents = [
  EVENT_CHANNEL_CREATED,
  EVENT_CHANNEL_UPDATED,
  EVENT_CHANNEL_HOOK_STATUS_UPDATED,
  EVENT_CHANNEL_METADATA_SET,
  EVENT_CHANNEL_TRANSFERRED,
] as const;

/**
 * An event sent to webhook when a channel is created.
 */
export const ChannelCreatedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_CHANNEL_CREATED),
    /**
     * Data of the event
     */
    data: z.object({
      channel: z.object({
        /**
         * ID of the channel. On wire it is a stringified bigint.
         */
        id: StringBigintSchema,
        /**
         * Created at date. On wire it is a ISO 8601 date and time string.
         */
        createdAt: ISO8601DateSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string.
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Owner address
         */
        owner: HexSchema,
        /**
         * Name of the channel
         */
        name: z.string(),
        /**
         * Description of the channel
         */
        description: z.string(),
        /**
         * Hook address
         */
        hook: HexSchema.nullable(),
        /**
         * Metadata of the channel
         */
        metadata: MetadataArraySchema,
        /**
         * Chain ID where the channel was created
         */
        chainId: z.number().int(),
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ChannelCreatedEvent = z.infer<typeof ChannelCreatedEventSchema>;

/**
 * An event sent to webhook when a channel is updated.
 */
export const ChannelUpdatedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_CHANNEL_UPDATED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated channel data
       */
      channel: z.object({
        /**
         * ID of the channel
         */
        id: StringBigintSchema,
        /**
         * Updated at date
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Name of the channel
         */
        name: z.string(),
        /**
         * Description of the channel
         */
        description: z.string(),
        /**
         * Metadata of the channel
         */
        metadata: MetadataArraySchema,
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ChannelUpdatedEvent = z.infer<typeof ChannelUpdatedEventSchema>;

/**
 * An event sent to webhook when a channel hook status is updated.
 */
export const ChannelHookStatusUpdatedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_CHANNEL_HOOK_STATUS_UPDATED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated channel data
       */
      channel: z.object({
        /**
         * ID of the channel
         */
        id: StringBigintSchema,
        /**
         * Hook address
         */
        hook: HexSchema.nullable(),
        /**
         * Updated at date
         */
        updatedAt: ISO8601DateSchema,
      }),
      /**
       * Updated hook data
       */
      hook: z.object({
        /**
         * Address of the hook
         */
        address: HexSchema,
        /**
         * Enabled status
         */
        enabled: z.boolean(),
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ChannelHookStatusUpdatedEvent = z.infer<
  typeof ChannelHookStatusUpdatedEventSchema
>;

/**
 * An event sent to webhook when a channel metadata is set.
 */
export const ChannelMetadataSetEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_CHANNEL_METADATA_SET),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated channel data
       */
      channel: z.object({
        /**
         * ID of the channel
         */
        id: StringBigintSchema,
        /**
         * Metadata of the channel
         */
        metadata: MetadataArraySchema,
        /**
         * Updated at date
         */
        updatedAt: ISO8601DateSchema,
      }),
      /**
       * Metadata operation
       */
      metadataOperation: MetadataSetOperationSchema,
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ChannelMetadataSetEvent = z.infer<
  typeof ChannelMetadataSetEventSchema
>;

/**
 * An event sent to webhook when a channel is transferred.
 */
export const ChannelTransferredEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_CHANNEL_TRANSFERRED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Updated channel data
       */
      channel: z.object({
        /**
         * ID of the channel
         */
        id: StringBigintSchema,
        /**
         * Owner address
         */
        owner: HexSchema,
        /**
         * Updated at date
         */
        updatedAt: ISO8601DateSchema,
      }),
      /**
       * From address
       */
      from: HexSchema,
      /**
       * To address
       */
      to: HexSchema,
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ChannelTransferredEvent = z.infer<
  typeof ChannelTransferredEventSchema
>;

/**
 * Channel events schema.
 */
export const ChannelEventsSchema = z.discriminatedUnion("event", [
  ChannelCreatedEventSchema,
  ChannelUpdatedEventSchema,
  ChannelHookStatusUpdatedEventSchema,
  ChannelMetadataSetEventSchema,
  ChannelTransferredEventSchema,
]);
