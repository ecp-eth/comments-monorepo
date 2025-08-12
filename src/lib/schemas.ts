import { HexSchema } from "@ecp.eth/sdk/core/schemas";
import {
  AddCommentTypedDataSchema,
  DeleteCommentTypedDataSchema,
  EditCommentDataSchema,
  EditCommentTypedDataSchema,
  CommentTypeSchema,
  MetadataArraySchema,
} from "@ecp.eth/sdk/comments/schemas";
import { CommentDataWithIdSchema } from "@ecp.eth/shared/schemas";
import { z } from "zod";
import { SUPPORTED_CHAINS } from "@ecp.eth/sdk";
import { AllowedChainIdSchema, env } from "./env";

export const GaslessPostCommentRequestBodySchema = z
  .object({
    signTypedDataParams: AddCommentTypedDataSchema,
    appSignature: HexSchema,
    authorSignature: HexSchema,
    chainId: AllowedChainIdSchema,
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const GaslessPostCommentResponseSchema = z.object({
  txHash: HexSchema,
});

// Shared comment schema for both endpoints
const sharedCommentSchema = z.object({
  author: HexSchema,
  content: z.string().trim().nonempty(),
  metadata: MetadataArraySchema,
  chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  commentType: CommentTypeSchema.optional(),
});

// Request schema for standard signing
export const SignCommentPayloadRequestSchema = z
  .union([
    sharedCommentSchema.extend({
      targetUri: z.string().url(),
    }),
    sharedCommentSchema.extend({
      parentId: HexSchema,
    }),
  ])
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

// Response schema for standard signing
export const SignCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: CommentDataWithIdSchema,
});

// Request schema for gasless signing
export const PrepareSignedGaslessCommentRequestBodySchema = z
  .union([
    sharedCommentSchema.extend({
      targetUri: z.string().url(),
      submitIfApproved: z.boolean(),
    }),
    sharedCommentSchema.extend({
      parentId: HexSchema,
      submitIfApproved: z.boolean(),
    }),
  ])
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

// Response schemas for gasless signing
export const PreparedSignedGaslessPostCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: AddCommentTypedDataSchema,
    id: HexSchema,
    appSignature: HexSchema,
    commentData: CommentDataWithIdSchema,
    chainId: AllowedChainIdSchema,
  });

export const PreparedGaslessPostCommentOperationApprovedResponseSchema =
  z.object({
    txHash: HexSchema,
    id: HexSchema,
    appSignature: HexSchema,
    commentData: CommentDataWithIdSchema,
    chainId: AllowedChainIdSchema,
  });

export const PrepareGaslessPostCommentOperationResponseSchema = z.union([
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
]);

// Error response schemas
export const BadRequestResponseSchema = z.record(
  z.string(),
  z.string().array(),
);

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Edit comment schemas
export const SignEditCommentPayloadRequestSchema = z
  .object({
    commentId: HexSchema,
    content: z.string().trim().nonempty(),
    author: HexSchema,
    metadata: MetadataArraySchema,
    chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const SignEditCommentResponseServerSchema = z.object({
  signature: HexSchema,
  hash: HexSchema,
  data: EditCommentDataSchema,
});

// Gasless edit comment schemas
export const PrepareSignedGaslessEditCommentRequestBodySchema = z
  .object({
    commentId: HexSchema,
    content: z.string().trim().nonempty(),
    author: HexSchema,
    metadata: MetadataArraySchema,
    submitIfApproved: z.boolean(),
    chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const GaslessEditRequestBodySchema = z
  .object({
    signTypedDataParams: EditCommentTypedDataSchema,
    appSignature: HexSchema,
    authorSignature: HexSchema,
    edit: EditCommentDataSchema,
    chainId: AllowedChainIdSchema,
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const GaslessEditResponseSchema = z.object({
  txHash: HexSchema,
});

export const PreparedSignedGaslessEditCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: EditCommentTypedDataSchema,
    appSignature: HexSchema,
    chainId: AllowedChainIdSchema,
    edit: EditCommentDataSchema,
  });

export const PreparedSignedGaslessEditCommentApprovedResponseSchema = z.object({
  txHash: HexSchema,
  appSignature: HexSchema,
  chainId: AllowedChainIdSchema,
  edit: EditCommentDataSchema,
});

export const PrepareGaslessEditCommentOperationResponseSchema = z.union([
  PreparedSignedGaslessEditCommentNotApprovedResponseSchema,
  PreparedSignedGaslessEditCommentApprovedResponseSchema,
]);

export const PrepareGaslessCommentDeletionRequestBodySchema = z
  .object({
    author: HexSchema,
    commentId: HexSchema,
    submitIfApproved: z.boolean(),
    chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const PreparedSignedGaslessDeleteCommentApprovedResponseSchema =
  z.object({
    txHash: HexSchema,
  });

export const PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema =
  z.object({
    signTypedDataParams: DeleteCommentTypedDataSchema,
    appSignature: HexSchema,
  });

export const GaslessDeleteCommentRequestBodySchema = z
  .object({
    signTypedDataParams: DeleteCommentTypedDataSchema,
    authorSignature: HexSchema,
    appSignature: HexSchema,
    chainId: AllowedChainIdSchema.default(env.DEFAULT_CHAIN_ID),
  })
  .transform((val) => {
    return {
      ...val,
      chainConfig: SUPPORTED_CHAINS[val.chainId],
    };
  });

export const GaslessDeleteCommentResponseSchema = z.object({
  txHash: HexSchema,
});
