import {
  AddApprovalTypedDataSchema,
  AddCommentTypedDataSchema,
  CommentDataSchema,
  DeleteCommentTypedDataSchema,
  HexSchema,
  IndexerAPICommentWithRepliesSchema,
  IndexerAPICommentSchema,
  type IndexerAPICommentSchemaType,
  IndexerAPIAuthorDataSchema,
  IndexerAPICursorPaginationSchemaType,
  IndexerAPICursorPaginationSchema,
} from "@ecp.eth/sdk/schemas";
import { z } from "zod";
// import { isProfane } from "./profanity-detection";

const CommentDataWithIdSchema = CommentDataSchema.extend({
  id: HexSchema,
});

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

/**
 * Parses response from API endpoint for usage in client
 */
export const SignCommentResponseClientSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

export type SignCommentResponseClientSchemaType = z.infer<
  typeof SignCommentResponseClientSchema
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
  chainId: z.number(),
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
    response: SignCommentResponseClientSchema,
    resolvedAuthor: IndexerAPIAuthorDataSchema.optional(),
    type: z.enum(["gasless-not-approved", "gasless-preapproved", "nongasless"]),
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
  pagination: IndexerAPICursorPaginationSchema,
});

export type IndexerAPIListCommentsWithPendingOperationsSchemaType = z.infer<
  typeof IndexerAPIListCommentsWithPendingOperationsSchema
>;

type CommentSchemaType = IndexerAPICommentSchemaType & {
  pendingOperation?: PendingCommentOperationSchemaType;
  replies?: {
    results: CommentSchemaType[];
    pagination: IndexerAPICursorPaginationSchemaType;
  };
};

export const CommentSchema: z.ZodType<CommentSchemaType> =
  IndexerAPICommentSchema.extend({
    replies: z
      .object({
        results: z.lazy(() => CommentSchema.array()),
        pagination: IndexerAPICursorPaginationSchema,
      })
      .optional(),
    pendingOperation: PendingCommentOperationSchema.optional(),
  });

export type Comment = z.infer<typeof CommentSchema>;

export const CommentPageSchema = z.object({
  results: CommentSchema.array(),
  pagination: IndexerAPICursorPaginationSchema,
});

export type CommentPageSchemaType = z.infer<typeof CommentPageSchema>;

export const ListCommentsQueryDataSchema = z.object({
  pages: CommentPageSchema.array(),
  pageParams: z.unknown().array(),
});

export type ListCommentsQueryDataSchemaType = z.infer<
  typeof ListCommentsQueryDataSchema
>;
