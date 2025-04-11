import {
  AddApprovalTypedDataSchema,
  AddCommentTypedDataSchema,
  DeleteCommentTypedDataSchema,
  HexSchema,
} from "@ecp.eth/sdk/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { z } from "zod";
// import { isProfane } from "./profanity-detection";

export const PrepareSignedGaslessCommentRequestBodySchema = z.object({
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty(),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .refine((val) => !isProfane(val), "Comment contains profanity"), */
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

export const PreparedSignedGaslessDeleteCommentApprovedResponseSchema =
  z.object({
    txHash: HexSchema,
  });

export type PreparedSignedGaslessDeleteCommentApprovedSchemaType = z.infer<
  typeof PreparedSignedGaslessDeleteCommentApprovedResponseSchema
>;

export const PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: DeleteCommentTypedDataSchema,
    appSignature: HexSchema,
  });

export type PreparedSignedGaslessDeleteCommentNotApprovedSchemaType = z.infer<
  typeof PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema
>;

export const PreparedSignedGaslessPostCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: AddCommentTypedDataSchema,
    id: HexSchema,
    appSignature: HexSchema,
    commentData: CommentDataWithIdSchema,
    chainId: z.number(),
  });

export type PreparedSignedGaslessPostCommentNotApprovedSchemaType = z.infer<
  typeof PreparedSignedGaslessPostCommentNotApprovedResponseSchema
>;

export const PreparedGaslessPostCommentOperationApprovedResponseSchema =
  z.object({
    txHash: HexSchema,
    id: HexSchema,
    appSignature: HexSchema,
    commentData: CommentDataWithIdSchema,
    chainId: z.number(),
  });

export type PreparedGaslessPostCommentOperationApprovedSchemaType = z.infer<
  typeof PreparedGaslessPostCommentOperationApprovedResponseSchema
>;

export const PrepareGaslessDeleteCommentOperationResponseSchema = z.union([
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
]);

export type PrepareGaslessDeleteCommentOperationResponseSchemaType = z.infer<
  typeof PrepareGaslessDeleteCommentOperationResponseSchema
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

export const SignCommentPayloadRequestSchema = z.object({
  author: HexSchema,
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty(),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .refine((val) => !isProfane(val), "Comment contains profanity"), */
  targetUri: z.string().url(),
  parentId: HexSchema.optional(),
});

export type SignCommentPayloadRequestSchemaType = z.infer<
  typeof SignCommentPayloadRequestSchema
>;

/**
 * Parses output from API endpoint
 */
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export const ChangeApprovalStatusRequestBodySchema = z.object({
  signTypedDataParams: AddApprovalTypedDataSchema,
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

export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array()
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

export const ApproveResponseSchema = z.object({
  txHash: HexSchema,
});
