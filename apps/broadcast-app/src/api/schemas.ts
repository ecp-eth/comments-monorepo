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

const sharedCommentServerSchema = z.object({
  author: HexSchema,
  channelId: z.coerce.bigint(),
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

/**
 * Server schema for the payload of the sign-comment endpoint.
 *
 * This schema is used to parse the payload of the sign-comment endpoint.
 * It is used to validate the payload of the sign-comment endpoint.
 */
export const SignCommentPayloadRequestServerSchema = z.union([
  sharedCommentServerSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentServerSchema.extend({
    parentId: HexSchema,
  }),
]);

const sharedCommentClientSchema = z.object({
  author: HexSchema,
  channelId: z.bigint().transform((val) => val.toString()),
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  commentType: z.number().default(DEFAULT_COMMENT_TYPE),
});

/**
 * Client schema for the payload of the sign-comment endpoint.
 *
 * This schema is used to parse the payload of the sign-comment endpoint.
 * It is used to validate the payload of the sign-comment endpoint.
 *
 * It also formats bigint to string.
 */
export const SignCommentPayloadRequestClientSchema = z.union([
  sharedCommentClientSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentClientSchema.extend({
    parentId: HexSchema,
  }),
]);

export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export const ChannelSchema = z.object({
  id: z.coerce.bigint(),
  chainId: z.number().int().positive(),
  name: z.string(),
  description: z.string(),
  owner: HexSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  isSubscribed: z.boolean(),
  notificationSettings: z.record(z.number().int(), z.boolean()),
});

export type Channel = z.infer<typeof ChannelSchema>;

export const ListChannelsResponseSchema = z.object({
  results: z.array(ChannelSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
});

export const SignEditCommentPayloadRequestClientSchema = z.object({
  author: HexSchema,
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
});

export const SignEditCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: z.object({
    commentId: HexSchema,
    content: z.string().trim().nonempty(),
    metadata: MetadataArraySchema,
    app: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
});
