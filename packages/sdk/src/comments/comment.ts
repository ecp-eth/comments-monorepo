import { z } from "zod";
import {
  COMMENTS_V1_ADDRESS,
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "../constants.js";
import { HexSchema, type Hex } from "../core/schemas.js";
import { CommentsV1Abi } from "../abis.js";
import {
  stringToHex,
  type ReadContractParameters,
  type ReadContractReturnType,
} from "viem";
import type {
  ContractWriteFunctions,
  ContractReadFunctions,
  CreateCommentDataParams,
  CommentData,
} from "./types.js";
import {
  AddCommentTypedDataSchema,
  type AddCommentTypedDataSchemaType,
  type CommentInputData,
  CommentInputDataSchema,
  DeleteCommentTypedDataSchema,
  type DeleteCommentTypedDataSchemaType,
} from "./schemas.js";
import {
  ADD_COMMENT_TYPE,
  DELETE_COMMENT_TYPE,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} from "./eip712.js";

export type PostCommentAsAuthorParams = {
  /**
   * The comment data
   *
   * You can obtain this by using the `createCommentData()` function
   */
  comment: CommentInputData;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The fee for the comment
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["postCommentAsAuthor"];
};

export type PostCommentAsAuthorResult = {
  txHash: Hex;
};

const PostCommentAsAuthorParamsSchema = z.object({
  // we don't care here because comment is validated internally by createCommentData
  comment: z.custom<CommentInputData>(() => true),
  appSignature: HexSchema,
  fee: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Posts a comment as an author
 *
 * @param params - The parameters for posting a comment as an author
 * @returns The transaction hash and comment ID
 */
export async function postCommentAsAuthor(
  params: PostCommentAsAuthorParams
): Promise<PostCommentAsAuthorResult> {
  const validatedParams = PostCommentAsAuthorParamsSchema.parse(params);

  const { comment, commentsAddress, fee, appSignature } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "postCommentAsAuthor",
    args: [comment, appSignature],
    value: fee,
  });

  return {
    txHash,
  };
}

export type PostCommentParams = {
  /**
   * The comment data
   *
   * You can obtain this by using the `createCommentData()` function
   */
  comment: CommentInputData;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The fee for the comment
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["postComment"];
};

export type PostCommentResult = {
  txHash: Hex;
};

const PostCommentParamsSchema = z.object({
  comment: z.custom<CommentInputData>(() => true),
  appSignature: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  fee: z.bigint().optional(),
});

/**
 * Posts a comment with author signature verification
 *
 * @param params - The parameters for posting a comment
 * @returns The transaction hash
 */
export async function postComment(params: PostCommentParams) {
  const validatedParams = PostCommentParamsSchema.parse(params);

  const { comment, appSignature, commentsAddress, fee } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "postComment",
    args: [comment, stringToHex(""), appSignature],
    value: fee,
  });

  return {
    txHash,
  };
}

export type GetCommentParams = {
  /**
   * The ID of the comment to get
   */
  commentId: Hex;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentsV1Abi, "getComment">
  ) => Promise<ReadContractReturnType<typeof CommentsV1Abi, "getComment">>;
};

export type GetCommentResult = {
  comment: CommentData;
};

const GetCommentParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get a comment by ID
 *
 * @param params - The parameters for getting a comment
 * @returns The comment data
 */
export async function getComment(
  params: GetCommentParams
): Promise<GetCommentResult> {
  const { commentId, commentsAddress } = GetCommentParamsSchema.parse(params);

  const comment = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getComment",
    args: [commentId],
  });

  return {
    comment,
  };
}

export type GetCommentIdParams = {
  /**
   * The comment data to get ID for
   */
  commentData: CreateCommentDataParams;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getCommentId"];
};

const GetCommentIdParamsSchema = z.object({
  commentData: z.custom<CreateCommentDataParams>(() => true),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get the ID for a comment before it is posted
 *
 * @param params - The parameters for getting a comment ID
 * @returns The comment ID
 */
export async function getCommentId(params: GetCommentIdParams): Promise<Hex> {
  const { commentData, commentsAddress } =
    GetCommentIdParamsSchema.parse(params);

  const commentId = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getCommentId",
    args: [createCommentData(commentData)],
  });

  return commentId;
}

export type DeleteCommentAsAuthorParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["deleteCommentAsAuthor"];
};

export type DeleteCommentAsAuthorResult = {
  txHash: Hex;
};

const DeleteCommentAsAuthorParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Delete a comment as an author
 *
 * @param params - The parameters for deleting a comment as an author
 * @returns The transaction hash
 */
export async function deleteCommentAsAuthor(
  params: DeleteCommentAsAuthorParams
): Promise<DeleteCommentAsAuthorResult> {
  const { commentId, commentsAddress } =
    DeleteCommentAsAuthorParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "deleteCommentAsAuthor",
    args: [commentId],
  });

  return {
    txHash,
  };
}

export type DeleteCommentParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  appSigner: Hex;
  /**
   * The nonce for the signature
   */
  nonce: bigint;
  /**
   * The deadline for the signature
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["deleteComment"];
};

const DeleteCommentParamsSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  appSignature: HexSchema,
});

/**
 * Delete a comment with app signature verification
 *
 * @param params - The parameters for deleting a comment
 * @returns The transaction hash
 */
export async function deleteComment(params: DeleteCommentParams) {
  const validatedParams = DeleteCommentParamsSchema.parse(params);

  const {
    commentId,
    author,
    appSigner,
    nonce,
    deadline,
    commentsAddress,
    appSignature,
  } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "deleteComment",
    args: [
      commentId,
      author,
      appSigner,
      nonce,
      deadline,
      stringToHex(""),
      appSignature,
    ],
  });

  return {
    txHash,
  };
}

export type GetDeleteCommentHashParams = {
  /**
   * The ID of the comment to delete
   */
  commentId: Hex;
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  appSigner: Hex;
  /**
   * The nonce for the signature
   */
  nonce: bigint;
  /**
   * The deadline for the signature
   */
  deadline: bigint;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<
      typeof CommentsV1Abi,
      "getDeleteCommentHash"
    >
  ) => Promise<
    ReadContractReturnType<typeof CommentsV1Abi, "getDeleteCommentHash">
  >;
};

const GetDeleteCommentHashParamsSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get the hash for deleting a comment
 *
 * @param params - The parameters for getting a delete comment hash
 * @returns The delete comment hash
 */
export async function getDeleteCommentHash(
  params: GetDeleteCommentHashParams
): Promise<Hex> {
  const { commentId, author, appSigner, nonce, deadline, commentsAddress } =
    GetDeleteCommentHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "getDeleteCommentHash",
    args: [commentId, author, appSigner, nonce, deadline],
  });

  return hash;
}

export type GetNonceParams = {
  /**
   * The author of the comment
   */
  author: Hex;
  /**
   * The app signer
   */
  appSigner: Hex;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentsV1Abi, "nonces">
  ) => Promise<ReadContractReturnType<typeof CommentsV1Abi, "nonces">>;
};

const GetNonceParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get the nonce for the author and app signer
 *
 * @param params - The parameters for getting a nonce
 * @returns The nonce
 */
export async function getNonce(params: GetNonceParams): Promise<bigint> {
  const { author, appSigner, commentsAddress } =
    GetNonceParamsSchema.parse(params);

  const nonce = await params.readContract({
    address: commentsAddress,
    abi: CommentsV1Abi,
    functionName: "nonces",
    args: [author, appSigner],
  });

  return nonce;
}

export type CreateCommentTypedDataParams = {
  commentData: CommentInputData;
  chainId: number;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateCommentTypedDataParamsSchema = z.object({
  commentData: z.custom<CommentInputData>(() => true),
  chainId: z.number(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for adding comment
 * @returns The typed data
 */
export function createCommentTypedData(
  params: CreateCommentTypedDataParams
): AddCommentTypedDataSchemaType {
  const validatedParams = CreateCommentTypedDataParamsSchema.parse(params);

  const { commentData, chainId, commentsAddress } = validatedParams;

  return AddCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: ADD_COMMENT_TYPE,
    primaryType: "AddComment",
    message: commentData,
  });
}

/**
 * Create the data structure of a comment
 * @return {@link schemas!CommentData | CommentData} The data structure of a comment
 *
 */
export function createCommentData({
  content,
  metadata,
  author,
  appSigner,
  nonce,
  deadline,
  channelId = DEFAULT_CHANNEL_ID,
  commentType = DEFAULT_COMMENT_TYPE,
  ...params
}: CreateCommentDataParams): CommentData {
  return CommentInputDataSchema.parse({
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: "parentId" in params ? "" : params.targetUri,
    parentId: "parentId" in params ? params.parentId : EMPTY_PARENT_ID,
    author,
    appSigner,
    channelId,
    commentType,
    nonce,
    deadline: deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day
  });
}

export type CreateDeleteCommentTypedDataParams = {
  commentId: Hex;
  chainId: number;
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENTS_V1_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateDeleteCommentTypedDataParamsSchema = z.object({
  commentId: HexSchema,
  chainId: z.number(),
  author: HexSchema,
  appSigner: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Create the EIP-712 typed data structure for deleting comment
 *
 * The comment won't be really deleted because of the nature of the blockchain.
 * The purpose of this is to mark comment as deleted so indexers can do their logic for deletions.
 *
 * @returns The typed data
 */
export function createDeleteCommentTypedData(
  params: CreateDeleteCommentTypedDataParams
): DeleteCommentTypedDataSchemaType {
  const validatedParams =
    CreateDeleteCommentTypedDataParamsSchema.parse(params);

  const {
    commentId,
    chainId,
    author,
    appSigner,
    nonce,
    deadline,
    commentsAddress,
  } = validatedParams;

  return DeleteCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: commentsAddress,
    },
    types: DELETE_COMMENT_TYPE,
    primaryType: "DeleteComment",
    message: {
      commentId,
      author,
      appSigner,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}
