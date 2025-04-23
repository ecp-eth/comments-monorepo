import { z } from "zod";
import { HexSchema } from "../schemas/core.js";
import { DOMAIN_NAME, DOMAIN_VERSION } from "./eip712.js";

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
