import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { z } from "zod";
import { CommentDataWithIdSchema } from "./shared";

/**
 * Parses response from API endpoint for usage in client
 */
export const SignCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export type SignCommentResponseClientSchemaType = z.infer<
  typeof SignCommentResponseClientSchema
>;
