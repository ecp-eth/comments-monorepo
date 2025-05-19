import { z } from "zod";
import {
  COMMENT_MANAGER_ADDRESS,
  DEFAULT_CHANNEL_ID,
  DEFAULT_COMMENT_TYPE,
  EMPTY_PARENT_ID,
} from "../constants.js";
import { HexSchema, type Hex } from "../core/schemas.js";
import { CommentManagerABI } from "../abis.js";
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
   * @default COMMENT_MANAGER_ADDRESS
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
  // we don't care here because comment is validated internally by createCommentData()
  comment: CommentInputDataSchema,
  appSignature: HexSchema,
  fee: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
    abi: CommentManagerABI,
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
   * The author signature. Necessary if the author hasn't approved the signer to post comments on their behalf.
   */
  authorSignature?: Hex;
  /**
   * The fee for the comment
   */
  fee?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
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
  comment: CommentInputDataSchema,
  appSignature: HexSchema,
  authorSignature: HexSchema.optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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

  const { comment, appSignature, authorSignature, commentsAddress, fee } =
    validatedParams;

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "postComment",
    args: [comment, authorSignature ?? stringToHex(""), appSignature],
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
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentManagerABI, "getComment">
  ) => Promise<ReadContractReturnType<typeof CommentManagerABI, "getComment">>;
};

export type GetCommentResult = {
  comment: CommentData;
};

const GetCommentParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
    abi: CommentManagerABI,
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
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: ContractReadFunctions["getCommentId"];
};

const GetCommentIdParamsSchema = z.object({
  commentData: z.custom<CreateCommentDataParams>(() => true),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
    abi: CommentManagerABI,
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
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  writeContract: ContractWriteFunctions["deleteCommentAsAuthor"];
};

export type DeleteCommentAsAuthorResult = {
  txHash: Hex;
};

const DeleteCommentAsAuthorParamsSchema = z.object({
  commentId: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
    abi: CommentManagerABI,
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
  app: Hex;
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
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  /**
   * The app signature
   */
  appSignature: Hex;
  /**
   * The author signature. Necessary if the author hasn't approved the signer to delete comments on their behalf.
   */
  authorSignature?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["deleteComment"];
};

const DeleteCommentParamsSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  app: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
  appSignature: HexSchema,
  authorSignature: HexSchema.optional(),
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
    app,
    nonce,
    deadline,
    commentsAddress,
    appSignature,
    authorSignature,
  } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "deleteComment",
    args: [
      commentId,
      author,
      app,
      nonce,
      deadline,
      authorSignature ?? stringToHex(""),
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
  app: Hex;
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
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<
      typeof CommentManagerABI,
      "getDeleteCommentHash"
    >
  ) => Promise<
    ReadContractReturnType<typeof CommentManagerABI, "getDeleteCommentHash">
  >;
};

const GetDeleteCommentHashParamsSchema = z.object({
  commentId: HexSchema,
  author: HexSchema,
  app: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
  const { commentId, author, app, nonce, deadline, commentsAddress } =
    GetDeleteCommentHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getDeleteCommentHash",
    args: [commentId, author, app, nonce, deadline],
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
  app: Hex;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentManagerABI, "getNonce">
  ) => Promise<ReadContractReturnType<typeof CommentManagerABI, "getNonce">>;
};

const GetNonceParamsSchema = z.object({
  author: HexSchema,
  app: HexSchema,
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
});

/**
 * Get the nonce for the author and app signer
 *
 * @param params - The parameters for getting a nonce
 * @returns The nonce
 */
export async function getNonce(params: GetNonceParams): Promise<bigint> {
  const { author, app, commentsAddress } = GetNonceParamsSchema.parse(params);

  const nonce = await params.readContract({
    address: commentsAddress,
    abi: CommentManagerABI,
    functionName: "getNonce",
    args: [author, app],
  });

  return nonce;
}

export type CreateCommentTypedDataParams = {
  commentData: CommentInputData;
  chainId: number;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateCommentTypedDataParamsSchema = z.object({
  commentData: z.custom<CommentInputData>(() => true),
  chainId: z.number(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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
 * @return {@link comments!CommentInputData | CommentInputData} The data structure of a comment
 *
 */
export function createCommentData({
  content,
  metadata,
  author,
  app,
  nonce,
  deadline,
  channelId = DEFAULT_CHANNEL_ID,
  commentType = DEFAULT_COMMENT_TYPE,
  ...params
}: CreateCommentDataParams): CommentInputData {
  return CommentInputDataSchema.parse({
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: "parentId" in params ? "" : params.targetUri,
    parentId: "parentId" in params ? params.parentId : EMPTY_PARENT_ID,
    author,
    app,
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
  app: Hex;
  nonce: bigint;
  deadline?: bigint;
  /**
   * The address of the comments contract
   * @default COMMENT_MANAGER_ADDRESS
   */
  commentsAddress?: Hex;
};

const CreateDeleteCommentTypedDataParamsSchema = z.object({
  commentId: HexSchema,
  chainId: z.number(),
  author: HexSchema,
  app: HexSchema,
  nonce: z.bigint(),
  deadline: z.bigint().optional(),
  commentsAddress: HexSchema.default(COMMENT_MANAGER_ADDRESS),
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

  const { commentId, chainId, author, app, nonce, deadline, commentsAddress } =
    validatedParams;

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
      app,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}
