import { HexSchema } from "@ecp.eth/sdk/schemas";
import { z } from "zod";

// TODO: reference the schema from ecp.eth/demo
export const SignCommentRequestBodySchema = z.object({
  content: z.string().trim().nonempty(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
  chainId: z.number(),
  author: HexSchema,
});

export type SignCommentRequestBodySchemaType = z.infer<
  typeof SignCommentRequestBodySchema
>;
