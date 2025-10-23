import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { EditCommentDataSchema } from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod";

/**
 * Parses response from API endpoint for usage in client
 */
export const SignEditCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: EditCommentDataSchema,
});

export type SignEditCommentResponseClientSchemaType = z.infer<
  typeof SignEditCommentResponseClientSchema
>;
