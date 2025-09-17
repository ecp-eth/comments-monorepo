import { z } from "zod";
import { HexSchema } from "../../../core/schemas.js";
import { MetadataArraySchema } from "../../../comments/schemas.js";
import {
  EventFromChainSchema,
  EventV1Schema,
  MetadataSetOperationSchema,
} from "./shared.js";

export const EVENT_CHANNEL_CREATED = "channel:created" as const;
export const EVENT_CHANNEL_UPDATED = "channel:updated" as const;
export const EVENT_CHANNEL_HOOK_STATUS_UPDATED =
  "channel:hook:status:updated" as const;
export const EVENT_CHANNEL_METADATA_SET = "channel:metadata:set" as const;
export const EVENT_CHANNEL_TRANSFERRED = "channel:transferred" as const;

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
         * ID of the channel
         */
        id: z.coerce.bigint(),
        /**
         * Created at date
         */
        createdAt: z.coerce.date(),
        /**
         * Updated at date
         */
        updatedAt: z.coerce.date(),
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
        id: z.coerce.bigint(),
        /**
         * Updated at date
         */
        updatedAt: z.coerce.date(),
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
        id: z.coerce.bigint(),
        /**
         * Hook address
         */
        hook: HexSchema.nullable(),
        /**
         * Updated at date
         */
        updatedAt: z.coerce.date(),
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
        id: z.coerce.bigint(),
        /**
         * Metadata of the channel
         */
        metadata: MetadataArraySchema,
        /**
         * Updated at date
         */
        updatedAt: z.coerce.date(),
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
        id: z.coerce.bigint(),
        /**
         * Owner address
         */
        owner: HexSchema,
        /**
         * Updated at date
         */
        updatedAt: z.coerce.date(),
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
