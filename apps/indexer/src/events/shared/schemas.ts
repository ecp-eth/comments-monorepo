import { z } from "zod";
import {
  type MetadataArraySchema,
  type MetadataArrayOpSchema,
} from "@ecp.eth/sdk/comments/schemas";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";

export type MetadataArray = z.infer<typeof MetadataArraySchema>;
export type MetadataArrayOp = z.infer<typeof MetadataArrayOpSchema>;

/**
 * Used as output formatter for JSON
 */
export const bigintToStringSchema = z
  .bigint()
  .transform((val) => val.toString());
/**
 * Used as output formatter for JSON
 */
export const dateToIsoStringSchema = z
  .date()
  .transform((val) => val.toISOString());

export const EventFromChainSchema = z.object({
  chainId: z.number().int(),
  blockNumber: bigintToStringSchema,
  logIndex: z.number().int(),
  txHash: HexSchema,
});

export const MetadataSetOperationSchema = z.discriminatedUnion("type", [
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

export type MetadataSetOperation = z.infer<typeof MetadataSetOperationSchema>;

export const CommentModerationStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
]);

export type CommentModerationStatus = z.infer<
  typeof CommentModerationStatusSchema
>;
