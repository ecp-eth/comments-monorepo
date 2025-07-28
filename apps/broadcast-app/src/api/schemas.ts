import { MetadataArraySchema } from "@ecp.eth/sdk/comments";
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import z from "zod";
import { DEFAULT_COMMENT_TYPE } from "@ecp.eth/sdk";

export const GenerateUploadUrlResponseSchema = z.object({
  url: z.string().url(),
});

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

const sharedCommentSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

export const SignCommentPayloadRequestSchema = z.union([
  sharedCommentSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentSchema.extend({
    parentId: HexSchema,
  }),
]);

export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});
