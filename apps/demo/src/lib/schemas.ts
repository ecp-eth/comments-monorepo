import {
  AddApprovalTypedDataSchema,
  AddCommentTypedDataSchema,
  CommentDataSchema,
  DeleteCommentTypedDataSchema,
  HexSchema,
} from "@ecp.eth/sdk/schemas";
import type { SignTypedDataParameters } from "viem";
import { z } from "zod";

const SignTypedDataParametersSchema = z.custom<SignTypedDataParameters>(
  (val) => val && typeof val === "object"
);

export const PrepareSignedGaslessCommentRequestBodySchema = z.object({
  content: z.string().trim().nonempty(),
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
  author: HexSchema,
  submitIfApproved: z.boolean(),
});

export type PrepareSignedGaslessCommentRequestBodySchemaType = z.infer<
  typeof PrepareSignedGaslessCommentRequestBodySchema
>;

export const PrepareGaslessCommentDeletionRequestBodySchema = z.object({
  author: HexSchema,
  commentId: HexSchema,
  submitIfApproved: z.boolean(),
});

export type PrepareGaslessCommentDeletionRequestBodySchemaType = z.infer<
  typeof PrepareGaslessCommentDeletionRequestBodySchema
>;

export const PreparedSignedGaslessCommentOperationNotApprovedSchema = z.object({
  signTypedDataParams: SignTypedDataParametersSchema,
  appSignature: HexSchema,
});

export type PreparedSignedGaslessCommentOperationNotApprovedSchemaType =
  z.infer<typeof PreparedSignedGaslessCommentOperationNotApprovedSchema>;

export const PreparedGaslessCommentOperationApprovedSchema = z.object({
  txHash: HexSchema,
});

export type PreparedGaslessCommentOperationApprovedSchemaType = z.infer<
  typeof PreparedGaslessCommentOperationApprovedSchema
>;

export const PreparedGaslessCommentOperationSchema = z.union([
  PreparedSignedGaslessCommentOperationNotApprovedSchema,
  PreparedGaslessCommentOperationApprovedSchema,
]);

export type PreparedGaslessCommentOperationSchemaType = z.infer<
  typeof PreparedGaslessCommentOperationSchema
>;

export const DeleteCommentRequestBodySchema = z.object({
  signTypedDataParams: DeleteCommentTypedDataSchema,
  authorSignature: HexSchema,
  appSignature: HexSchema,
});

export type DeleteCommentRequestBodySchemaType = z.infer<
  typeof DeleteCommentRequestBodySchema
>;

export const DeleteCommentResponseSchema = z.object({
  txHash: HexSchema,
});

export type DeleteCommentResponseSchemaType = z.infer<
  typeof DeleteCommentResponseSchema
>;

export const GaslessPostCommentRequestBodySchema = z.object({
  signTypedDataParams: AddCommentTypedDataSchema,
  appSignature: HexSchema,
  authorSignature: HexSchema,
});

export type GaslessPostCommentRequestBodySchemaType = z.infer<
  typeof GaslessPostCommentRequestBodySchema
>;

export const GaslessPostCommentResponseSchema = z.object({
  txHash: HexSchema,
});

export type GaslessPostCommentResponseSchemaType = z.infer<
  typeof GaslessPostCommentResponseSchema
>;

export const SignCommentResponseSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataSchema,
});

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

export const GetApprovalStatusNotApprovedSchema = z.object({
  approved: z.literal(false),
  appSignature: HexSchema,
  signTypedDataParams: SignTypedDataParametersSchema,
});

export type GetApprovalStatusNotApprovedSchemaType = z.infer<
  typeof GetApprovalStatusNotApprovedSchema
>;

export const GetApprovalStatusApprovedSchema = z.object({
  approved: z.literal(true),
  appSigner: HexSchema,
});

export type GetApprovalStatusApprovedSchemaType = z.infer<
  typeof GetApprovalStatusApprovedSchema
>;

export const GetApprovalStatusSchema = z.union([
  GetApprovalStatusNotApprovedSchema,
  GetApprovalStatusApprovedSchema,
]);

export type GetApprovalStatusSchemaType = z.infer<
  typeof GetApprovalStatusSchema
>;

export const ChangeApprovalStatusRequestBodySchema = z.object({
  signTypedDataParams: AddApprovalTypedDataSchema,
  appSignature: HexSchema,
  authorSignature: HexSchema,
});

export type ChangeApprovalStatusRequestBodySchemaType = z.infer<
  typeof ChangeApprovalStatusRequestBodySchema
>;

export const ChangeApprovalStatusResponseSchema = z.object({
  txHash: HexSchema,
});

export type ChangeApprovalStatusResponseSchemaType = z.infer<
  typeof ChangeApprovalStatusResponseSchema
>;
