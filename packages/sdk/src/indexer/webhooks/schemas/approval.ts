import { z } from "zod";
import {
  EventFromChainSchema,
  EventV1Schema,
  ISO8601DateSchema,
} from "./shared.js";
import { HexSchema } from "../../../core/schemas.js";

export const EVENT_APPROVAL_ADDED = "approval:added" as const;
export const EVENT_APPROVAL_REMOVED = "approval:removed" as const;

/**
 * Approval events.
 */
export const ApprovalEvents = [
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
] as const;

/**
 * An event sent to webhook when an approval is added
 */
export const ApprovalAddedEventSchema = z
  .object({
    /**
     * Event type
     */
    event: z.literal(EVENT_APPROVAL_ADDED),
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
