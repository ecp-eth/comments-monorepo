import { z } from "zod";
import {
  dateToIsoStringSchema,
  EventFromChainDbToOpenApiSchema,
  EventFromChainSchema,
} from "../shared/schemas.ts";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
  type ApprovalAddedEventSchema as OutputApprovalAddedEventSchema,
  type ApprovalRemovedEventSchema as OutputApprovalRemovedEventSchema,
  type ApprovalEvents as SDKApprovalEvents,
} from "@ecp.eth/sdk/indexer/webhooks/schemas";

export const ApprovalEvents = [
  EVENT_APPROVAL_ADDED,
  EVENT_APPROVAL_REMOVED,
] as const;

export type ApprovalEvent = (typeof ApprovalEvents)[number];

export const ApprovalAddedEventSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: dateToIsoStringSchema,
        updatedAt: dateToIsoStringSchema,
        author: HexSchema,
        app: HexSchema,
      }),
    }),
  })
  .merge(EventFromChainSchema);

export const ApprovalAddedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_ADDED satisfies ApprovalEvent),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      approval: z.object({
        id: z.string(),
        createdAt: z.string().datetime(),
        updatedAt: z.string().datetime(),
        author: HexSchema,
        app: HexSchema,
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ApprovalAddedEventInput = z.input<typeof ApprovalAddedEventSchema>;

export type ApprovalAddedEvent = z.infer<typeof ApprovalAddedEventSchema>;

({}) as unknown as z.input<
  typeof ApprovalAddedEventDbToOpenApiSchema
> satisfies ApprovalAddedEvent;

({}) as unknown as z.infer<
  typeof ApprovalAddedEventDbToOpenApiSchema
> satisfies ApprovalAddedEvent;

export const ApprovalRemovedEventSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_REMOVED satisfies ApprovalEvent),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      approval: z.object({
        id: z.string(),
      }),
    }),
  })
  .merge(EventFromChainSchema);

export const ApprovalRemovedEventDbToOpenApiSchema = z
  .object({
    event: z.literal(EVENT_APPROVAL_REMOVED satisfies ApprovalEvent),
    uid: z.string(),
    version: z.literal(1),
    data: z.object({
      approval: z.object({
        id: z.string(),
      }),
    }),
  })
  .merge(EventFromChainDbToOpenApiSchema);

export type ApprovalRemovedEventInput = z.input<
  typeof ApprovalRemovedEventSchema
>;

export type ApprovalRemovedEvent = z.infer<typeof ApprovalRemovedEventSchema>;

({}) as unknown as z.input<
  typeof ApprovalRemovedEventDbToOpenApiSchema
> satisfies ApprovalRemovedEvent;

({}) as unknown as z.infer<
  typeof ApprovalRemovedEventDbToOpenApiSchema
> satisfies ApprovalRemovedEvent;

// assert that the schema output is the same as input to sdk
({}) as unknown as ApprovalAddedEvent satisfies z.input<
  typeof OutputApprovalAddedEventSchema
>;
({}) as unknown as ApprovalRemovedEvent satisfies z.input<
  typeof OutputApprovalRemovedEventSchema
>;
({}) as unknown as typeof SDKApprovalEvents satisfies typeof ApprovalEvents;

/**
 * This is a list of all the approval events that are supported by the database to openapi schema converter.
 * It is used to convert the database to openapi schema.
 */
export const ApprovalEventsFromDbToOpenApiSchema = [
  ApprovalAddedEventDbToOpenApiSchema,
  ApprovalRemovedEventDbToOpenApiSchema,
] as const;
