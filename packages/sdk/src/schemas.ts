import type { SignTypedDataParameters } from "viem";
import { z } from "zod";
import type { Hex } from "./types.js";

export const HexSchema = z.custom<Hex>(
  (val) =>
    z
      .string()
      .regex(/^0x[0-9a-fA-F]+$/)
      .safeParse(val).success
);

const CommentData = z.object({
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string(),
  parentId: HexSchema.describe("0 bytes Hex for parent comments"),
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.coerce.bigint(),
  deadline: z.coerce.bigint(),
});

const Comment = z.object({
  timestamp: z.date(),
  id: HexSchema,
  content: z.string(),
  metadata: z.string(),
  targetUri: z.string().nullable(),
  parentId: HexSchema.nullable(),
  author: HexSchema,
  chainId: z.number().int().positive(),
  deletedAt: z.date().nullable(),
  appSigner: HexSchema,
  txHash: HexSchema,
  logIndex: z.number(),
});

export const CommentSchema = Comment.extend({
  replies: z.lazy(() => Comment.array()),
});

export type CommentSchemaType = z.infer<typeof CommentSchema>;

export const CommentInputSchema = z.object({
  content: z.string(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional().describe("The ID of the parent comment"),
  author: HexSchema,
});

export type CommentInputSchemaType = z.infer<typeof CommentInputSchema>;

export const SignCommentByAppRequestSchema = z.object({
  content: z.string(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional().describe("The ID of the parent comment"),
  author: HexSchema,
});

export type SignCommentByAppRequestSchemaType = z.infer<
  typeof SignCommentByAppRequestSchema
>;

export const AppSignedCommentSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  chainId: z
    .number()
    .int()
    .positive()
    .describe("Chain id that should be used to sign the comment"),
  data: CommentData,
});

export type AppSignedCommentSchemaType = z.infer<typeof AppSignedCommentSchema>;

export const SignGaslessCommentApprovedResponseSchema = z.object({
  txHash: HexSchema,
});

export type SignGaslessCommentApprovedResponseSchemaType = z.infer<
  typeof SignGaslessCommentApprovedResponseSchema
>;

export const SignGaslessCommentRequiresSigningResponseSchema = z
  .object({
    signTypedDataArgs: z.custom<SignTypedDataParameters>(
      (val) => z.any().safeParse(val).success
    ),
  })
  .passthrough();

export type SignGaslessCommentRequiresSigningResponseSchemaType = z.infer<
  typeof SignGaslessCommentRequiresSigningResponseSchema
>;

export const GaslessCommentSignatureResponseSchema = z.union([
  SignGaslessCommentApprovedResponseSchema,
  SignGaslessCommentRequiresSigningResponseSchema,
]);

export type GaslessCommentSignatureResponseSchemaType = z.infer<
  typeof GaslessCommentSignatureResponseSchema
>;
