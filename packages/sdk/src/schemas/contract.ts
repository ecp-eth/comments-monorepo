import { z } from "zod";
import { DOMAIN_NAME, DOMAIN_VERSION } from "../eip712.js";
import { COMMENTS_V1_ADDRESS } from "../constants.js";
import { HexSchema, CommentDataSchema } from "./core.js";

export const DeleteCommentTypedDataSchema = z.object({
  primaryType: z.literal("DeleteComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
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

export const AddCommentTypedDataSchema = z.object({
  primaryType: z.literal("AddComment"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
  }),
  message: CommentDataSchema,
  types: z.object({
    AddComment: z.array(
      z.union([
        z.object({ name: z.literal("content"), type: z.literal("string") }),
        z.object({ name: z.literal("metadata"), type: z.literal("string") }),
        z.object({ name: z.literal("targetUri"), type: z.literal("string") }),
        z.object({ name: z.literal("parentId"), type: z.literal("bytes32") }),
        z.object({ name: z.literal("author"), type: z.literal("address") }),
        z.object({ name: z.literal("appSigner"), type: z.literal("address") }),
        z.object({ name: z.literal("nonce"), type: z.literal("uint256") }),
        z.object({ name: z.literal("deadline"), type: z.literal("uint256") }),
      ])
    ),
  }),
});

export type AddCommentTypedDataSchemaType = z.infer<
  typeof AddCommentTypedDataSchema
>;

export const AddApprovalTypedDataSchema = z.object({
  primaryType: z.literal("AddApproval"),
  domain: z.object({
    name: z.literal(DOMAIN_NAME),
    version: z.literal(DOMAIN_VERSION),
    chainId: z.number(),
    verifyingContract: z.literal(COMMENTS_V1_ADDRESS),
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
