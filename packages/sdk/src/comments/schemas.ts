import { z } from "zod";
import { HexSchema } from "../core/schemas.js";
import { DOMAIN_NAME, DOMAIN_VERSION } from "./eip712.js";
import {
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "../constants.js";
import type {
  CommentData,
  CreateReplyCommentDataParams,
  CreateRootCommentDataParams,
} from "./types.js";

/**
 * Comment schema. This is used as output of the functions.
 */
export const CommentDataSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,

  channelId: z.bigint(),
  nonce: z.bigint(),
  deadline: z.bigint(),
  parentId: HexSchema,

  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  commentType: z.string(),
});

// this just tests if the shape is correct
({}) as z.infer<typeof CommentDataSchema> satisfies CommentData;

const BaseCommentInputDataSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,

  channelId: z.bigint().default(DEFAULT_CHANNEL_ID),
  nonce: z.bigint(),
  deadline: z.bigint(),
  parentId: HexSchema,

  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  commentType: z.string().default(DEFAULT_COMMENT_TYPE),
});

export const RootCommentInputDataSchema = BaseCommentInputDataSchema.omit({
  targetUri: true,
  parentId: true,
}).extend({
  targetUri: z.string(),
  parentId: z.literal(EMPTY_PARENT_ID),
});

// this just tests if the shape is correct
({}) as z.infer<typeof RootCommentInputDataSchema> satisfies Omit<
  CreateRootCommentDataParams,
  "metadata"
>;

export const ReplyCommentInputDataSchema = BaseCommentInputDataSchema.omit({
  targetUri: true,
}).extend({
  targetUri: z.literal(""),
});

// this just tests if the shape is correct
({}) as z.infer<typeof ReplyCommentInputDataSchema> satisfies Omit<
  CreateReplyCommentDataParams,
  "metadata"
>;

export const CommentInputDataSchema = z.union([
  RootCommentInputDataSchema,
  ReplyCommentInputDataSchema,
]);

export type CommentInputData = z.infer<typeof CommentInputDataSchema>;

export const AddCommentTypedDataSchema = z.object({
  primaryType: z.literal("AddComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: CommentDataSchema,
  types: z.object({
    AddComment: z.array(
      z.union([
        z.object({ name: z.literal("content"), type: z.literal("string") }),
        z.object({ name: z.literal("metadata"), type: z.literal("string") }),
        z.object({ name: z.literal("targetUri"), type: z.literal("string") }),
        z.object({ name: z.literal("commentType"), type: z.literal("string") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("channelId"), type: z.literal("uint256") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
        z.object({ name: z.literal("parentId"), type: z.literal("bytes32") }),
      ])
    ),
  }),
});

export type AddCommentTypedDataSchemaType = z.infer<
  typeof AddCommentTypedDataSchema
>;

export const DeleteCommentTypedDataSchema = z.object({
  primaryType: z.literal("DeleteComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    commentId: HexSchema,
    appSigner: HexSchema,
    author: HexSchema,
    deadline: z.coerce.bigint(),
    nonce: z.coerce.bigint(),
  }),
  types: z.object({
    DeleteComment: z.array(
      z.union([
        z.object({ name: z.literal("commentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type DeleteCommentTypedDataSchemaType = z.infer<
  typeof DeleteCommentTypedDataSchema
>;

export const AddApprovalTypedDataSchema = z.object({
  primaryType: z.literal("AddApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    author: HexSchema,
    appSigner: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    AddApproval: z.array(
      z.union([
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type AddApprovalTypedDataSchemaType = z.infer<
  typeof AddApprovalTypedDataSchema
>;

export const RemoveApprovalTypedDataSchema = z.object({
  primaryType: z.literal("RemoveApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: HexSchema,
  }),
  message: z.object({
    author: HexSchema,
    appSigner: HexSchema,
    nonce: z.coerce.bigint(),
    deadline: z.coerce.bigint(),
  }),
  types: z.object({
    RemoveApproval: z.array(
      z.union([
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type RemoveApprovalTypedDataSchemaType = z.infer<
  typeof RemoveApprovalTypedDataSchema
>;
