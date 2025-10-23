import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  CommentInputData,
  CreateCommentDataSchema,
  MetadataEntrySchema,
} from "@ecp.eth/sdk/comments/schemas";
import { z } from "zod";

export const CommentDataWithIdSchema = CreateCommentDataSchema.extend({
  id: HexSchema,
  metadata: MetadataEntrySchema.array(),
});

export type CommentDataWithIdSchemaType = z.infer<
  typeof CommentDataWithIdSchema
>;

// this is just for type checking
({}) as CommentDataWithIdSchemaType satisfies CommentInputData;
