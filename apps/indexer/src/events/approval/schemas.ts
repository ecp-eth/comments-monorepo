import { z } from "zod";
import {
  dateToIsoStringSchema,
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

export type ApprovalAddedEventInput = z.input<typeof ApprovalAddedEventSchema>;

export type ApprovalAddedEvent = z.infer<typeof ApprovalAddedEventSchema>;

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

export type ApprovalRemovedEventInput = z.input<
  typeof ApprovalRemovedEventSchema
>;

export type ApprovalRemovedEvent = z.infer<typeof ApprovalRemovedEventSchema>;

// assert that the schema output is the same as input to sdk
({}) as unknown as ApprovalAddedEvent satisfies z.input<
  typeof OutputApprovalAddedEventSchema
>;
({}) as unknown as ApprovalRemovedEvent satisfies z.input<
  typeof OutputApprovalRemovedEventSchema
>;
({}) as unknown as typeof SDKApprovalEvents satisfies typeof ApprovalEvents;
