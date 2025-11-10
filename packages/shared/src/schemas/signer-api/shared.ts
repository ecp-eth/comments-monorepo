import {
  CommentInputData,
  CreateCommentDataSchema,
  MetadataEntrySchema,
} from "@ecp.eth/sdk/comments";
import { HexSchema } from "@ecp.eth/sdk/core";
import { z } from "zod/v3";

export const CommentDataWithIdSchema = CreateCommentDataSchema.extend({
  id: HexSchema,
  metadata: MetadataEntrySchema.array(),
});

export type CommentDataWithIdSchemaType = z.infer<
  typeof CommentDataWithIdSchema
>;

// this is just for type checking
({}) as CommentDataWithIdSchemaType satisfies CommentInputData;

// Error response schemas
export const BadRequestResponseBodySchema = z.record(
  z.string(),
  z.string().array(),
);

export const ErrorResponseBodySchema = z.object({
  error: z.string(),
});

export const AuthorSignatureSchema = HexSchema.describe(
  "The signature of the author, required if the submitter address is not approved. If the submitter address is approved, this field can be replaced by a SIWE access token in `Authorization` header to avoid repetitive signing by the author",
).optional();
