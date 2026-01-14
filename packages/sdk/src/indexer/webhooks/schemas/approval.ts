import { z } from "zod/v3";
import {
  EventFromChainSchema,
  EventBaseSchema,
  EventV1Schema,
  ISO8601DateSchema,
} from "./shared.js";
import { HexSchema } from "../../../core/schemas.js";

export const EVENT_APPROVAL_ADDED = "approval:added" as const;
export const EVENT_APPROVAL_REMOVED = "approval:removed" as const;
export const EVENT_APPROVAL_EXPIRED = "approval:expired" as const;

/**
 * Approval events.
 */
export const ApprovalEvents = [
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
  EVENT_APPROVAL_EXPIRED,
] as const;

export const ApprovalAddedEventV1Schema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_APPROVAL_ADDED),
    /**
     * Version of the event
     */
    version: z.literal(1),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Approval data
       */
      approval: z.object({
        /**
         * ID of the approval
         */
        id: z.string(),
        /**
         * Created at date. On wire it is a ISO 8601 date and time string.
         */
        createdAt: ISO8601DateSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string.
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Author address
         */
        author: HexSchema,
        /**
         * App address
         */
        app: HexSchema,
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export const ApprovalAddedEventV2Schema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_APPROVAL_ADDED),
    /**
     * Version of the event
     */
    version: z.literal(2),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Approval data
       */
      approval: z.object({
        /**
         * ID of the approval
         */
        id: z.string(),
        /**
         * Created at date. On wire it is a ISO 8601 date and time string.
         */
        createdAt: ISO8601DateSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string.
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Author address
         */
        author: HexSchema,
        /**
         * App address
         */
        app: HexSchema,
        /**
         * Expires at date. On wire it is a ISO 8601 date and time string.
         */
        expiresAt: ISO8601DateSchema,
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventBaseSchema);

/**
 * An event sent to webhook when an approval is added
 */
export const ApprovalAddedEventSchema = z.discriminatedUnion("version", [
  ApprovalAddedEventV1Schema,
  ApprovalAddedEventV2Schema,
]);

export type ApprovalAddedEvent = z.infer<typeof ApprovalAddedEventSchema>;

/**
 * An event sent to webhook when an approval is removed
 */
export const ApprovalRemovedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_APPROVAL_REMOVED),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Approval data
       */
      approval: z.object({
        /**
         * ID of the approval that was removed
         */
        id: z.string(),
      }),
    }),
  })
  .merge(EventFromChainSchema)
  .merge(EventV1Schema);

export type ApprovalRemovedEvent = z.infer<typeof ApprovalRemovedEventSchema>;

/**
 * An event sent to webhook when an approval expires
 */
export const ApprovalExpiredEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_APPROVAL_EXPIRED),
    /**
     * Chain ID where the approval exists
     */
    chainId: z.number().int(),
    /**
     * Data of the event
     */
    data: z.object({
      /**
       * Approval data
       */
      approval: z.object({
        /**
         * ID of the approval that expired
         */
        id: z.string(),
        /**
         * Created at date. On wire it is a ISO 8601 date and time string.
         */
        createdAt: ISO8601DateSchema,
        /**
         * Updated at date. On wire it is a ISO 8601 date and time string.
         */
        updatedAt: ISO8601DateSchema,
        /**
         * Author address of the approval
         */
        author: HexSchema,
        /**
         * App address
         */
        app: HexSchema,
        /**
         * Expires at date. On wire it is a ISO 8601 date and time string.
         */
        expiresAt: ISO8601DateSchema,
      }),
    }),
  })
  .merge(EventV1Schema);

export type ApprovalExpiredEvent = z.infer<typeof ApprovalExpiredEventSchema>;

/**
 * Approval events schema.
 */
export const ApprovalEventsSchema = z.union([
  ApprovalAddedEventSchema,
  ApprovalRemovedEventSchema,
  ApprovalExpiredEventSchema,
]);
