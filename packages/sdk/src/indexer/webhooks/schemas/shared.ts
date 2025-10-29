import { z } from "zod/v3";
import { HexSchema } from "../../../core/schemas.js";

/**
 * Stringified bigint schema. Used to convert the stringified bigint from JSON to bigint.
 */
export const StringBigintSchema = z.string().transform((val, ctx) => {
  const result = z.coerce.bigint().safeParse(val);

  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid block number, could not coerce to bigint",
    });

    return z.NEVER;
  }

  return result.data;
});

/**
 * ISO 8601 date schema. Used to convert the ISO 8601 date from JSON to date.
 */
export const ISO8601DateSchema = z.string().transform((val, ctx) => {
  const result = z.coerce.date().safeParse(val);

  if (!result.success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date, could not coerce to date",
    });

    return z.NEVER;
  }

  return result.data;
});

/**
 * Common schema for all v1 events.
 */
export const EventV1Schema = z.object({
  /**
   * Unique identifier for the event. You can use it to deduplicate events.
   * In case of retry attempts the id is the same.
   */
  uid: z.string(),
  /**
   * Version of the event
   */
  version: z.literal(1),
});

/**
 * Common schema for all events coming from a chain.
 */
export const EventFromChainSchema = z.object({
  /**
   * Chain ID
   */
  chainId: z.number().int(),
  /**
   * Block number. On wire it is a stringified bigint.
   */
  blockNumber: StringBigintSchema,
  /**
   * Log index
   */
  logIndex: z.number().int(),
  /**
   * Transaction hash
   */
  txHash: HexSchema,
});

/**
 * Common schema for all metadata set operations.
 */
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
