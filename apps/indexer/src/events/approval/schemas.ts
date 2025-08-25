import { z } from "zod";
import { dateToIsoStringSchema, EventFromChainSchema } from "../shared/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";

export const ApprovalAddedEventSchema = z
  .object({
    event: z.literal("approval:added"),
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
    event: z.literal("approval:removed"),
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
