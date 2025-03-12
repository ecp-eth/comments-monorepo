import {
  AddApprovalTypedDataSchema,
  AddCommentTypedDataSchema,
  CommentDataSchema,
  DeleteCommentTypedDataSchema,
  HexSchema,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPIPaginationSchema,
} from "@ecp.eth/sdk/schemas";
import { z } from "zod";
// import { isProfane } from "./profanity-detection";

export const PrepareSignedGaslessCommentRequestBodySchema = z.object({
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty(),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .refine((val) => !isProfane(val), "Comment contains profanity"),*/
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
    commentData: CommentDataSchema,
  });

export type PreparedSignedGaslessPostCommentNotApprovedSchemaType = z.infer<
  typeof PreparedSignedGaslessPostCommentNotApprovedResponseSchema
>;

export const PreparedGaslessPostCommentOperationApprovedResponseSchema =
  z.object({
    txHash: HexSchema,
    id: HexSchema,
    appSignature: HexSchema,
    commentData: CommentDataSchema,
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

export const SignCommentResponseSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataSchema,
});

export const SignCommentRequestBodySchema = z.object({
  // replace with following line to enable basic profanity detection
  content: z.string().trim().nonempty(),
  /* content: z
    .string()
    .trim()
    .nonempty()
    .refine((val) => {
      return !isProfane(val);
    }, "Comment contains profanity"), */
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
  signTypedDataParams: AddApprovalTypedDataSchema,
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

export const PendingCommentOperationSchema = z
  .object({
    txHash: HexSchema,
    chainId: z.number().positive().int(),
    response: SignCommentResponseSchema,
  })
  .describe(
    "Contains information about pending operation so we can show that in comment list"
  );

export type PendingCommentOperationSchemaType = z.infer<
  typeof PendingCommentOperationSchema
>;

/**
 * A object with an attached property to indicate the parent object is a pending operation
 */
export const PendingOperationSchema = z
  .object({
    pendingType: z.enum(["insert", "delete"]).optional(),
  })
  .describe(
    "A object with an attached property to indicate the parent object is a pending operation"
  );

export type PendingOperationSchemaType = z.infer<typeof PendingOperationSchema>;

export const IndexerAPICommentWithPendingOperationSchema =
  IndexerAPICommentWithRepliesSchema.extend(PendingOperationSchema.shape);

export type IndexerAPICommentWithPendingOperationSchemaType = z.infer<
  typeof IndexerAPICommentWithPendingOperationSchema
>;

export const IndexerAPIListCommentsWithPendingOperationsSchema = z.object({
  results: z.array(
    IndexerAPICommentWithRepliesSchema.extend(PendingOperationSchema.shape)
  ),
  pagination: IndexerAPIPaginationSchema,
});

export type IndexerAPIListCommentsWithPendingOperationsSchemaType = z.infer<
  typeof IndexerAPIListCommentsWithPendingOperationsSchema
>;
