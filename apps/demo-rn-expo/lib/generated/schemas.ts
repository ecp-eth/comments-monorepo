// !!! DO NOT MODIFY !!!
// THIS FILE IS COPIED DIRECTLY FROM DEMO APP
// Run script instead: `pnpm run api:schema:sync`
import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  AddApprovalTypedDataSchema,
  AddCommentTypedDataSchema,
  DeleteCommentTypedDataSchema,
  EditCommentDataSchema,
  EditCommentTypedDataSchema,
  CommentMetadataSchema,
} from "@ecp.eth/sdk/comments/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { z } from "zod";

const sharedCommentSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: CommentMetadataSchema,
});

export const PrepareSignedGaslessCommentRequestBodySchema = z.union([
  sharedCommentSchema.extend({
    targetUri: z.string().url(),
    submitIfApproved: z.boolean(),
  }),
  sharedCommentSchema.extend({
    parentId: HexSchema,
    submitIfApproved: z.boolean(),
  }),
]);

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

export const SignCommentPayloadRequestSchema = z.union([
  sharedCommentSchema.extend({
    targetUri: z.string().url(),
  }),
  sharedCommentSchema.extend({
    parentId: HexSchema,
  }),
]);

export type SignCommentPayloadRequestSchemaType = z.infer<
  typeof SignCommentPayloadRequestSchema
>;

export const GaslessEditRequestBodySchema = z.object({
  signTypedDataParams: EditCommentTypedDataSchema,
  appSignature: HexSchema,
  authorSignature: HexSchema,
  edit: EditCommentDataSchema,
});

export type GaslessEditRequestBodySchemaType = z.infer<
  typeof GaslessEditRequestBodySchema
>;

export const GaslessEditResponseSchema = z.object({
  txHash: HexSchema,
});

export type GaslessEditResponseSchemaType = z.infer<
  typeof GaslessEditResponseSchema
>;

export const PrepareSignedGaslessEditCommentRequestBodySchema = z.object({
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  author: HexSchema,
  metadata: z.string(),
  submitIfApproved: z.boolean(),
});

export type PrepareSignedGaslessEditCommentRequestBodySchemaType = z.infer<
  typeof PrepareSignedGaslessEditCommentRequestBodySchema
>;

export const PrepareSignedGaslessEditCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: EditCommentTypedDataSchema,
    appSignature: HexSchema,
    chainId: z.number(),
    edit: EditCommentDataSchema,
  });

export type PrepareSignedGaslessEditCommentNotApprovedResponseSchemaType =
  z.infer<typeof PrepareSignedGaslessEditCommentNotApprovedResponseSchema>;

export const PrepareSignedGaslessEditCommentApprovedResponseSchema = z.object({
  txHash: HexSchema,
  edit: EditCommentDataSchema,
  appSignature: HexSchema,
  chainId: z.number(),
});

export type PrepareSignedGaslessEditCommentApprovedResponseSchemaType = z.infer<
  typeof PrepareSignedGaslessEditCommentApprovedResponseSchema
>;

/**
 * Used for editing comments (gas is paid by the user)
 */
export const SignEditCommentPayloadRequestSchema = z.object({
  commentId: HexSchema,
  content: z.string().trim().nonempty(),
  author: HexSchema,
  metadata: z.string(),
});

export type SignEditCommentPayloadRequestSchemaType = z.infer<
  typeof SignEditCommentPayloadRequestSchema
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
  z.string().array(),
);

export const InternalServerErrorResponseSchema = z.object({
  error: z.string(),
});

export const ApproveResponseSchema = z.object({
  txHash: HexSchema,
});
