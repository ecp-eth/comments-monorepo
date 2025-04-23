import { z } from "zod";
import { COMMENTS_V1_ADDRESS } from "../constants.js";
import { HexSchema, type CommentData } from "../schemas/core.js";
import type { Hex } from "../types.js";
import { CommentsV1Abi } from "../abis.js";
import { type ReadContractParameters, type ReadContractReturnType } from "viem";
import type { ContractWriteFunctions, ContractReadFunctions } from "./types.js";
import { createCommentData, type CreateCommentDataParams } from "../utils.js";

export type PostCommentAsAuthorParams = {
  /**
   * The comment data
   */
  comment: CreateCommentDataParams;
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
  commentsContractAddress?: Hex;
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
  comment: z.custom<CreateCommentDataParams>(() => true),
  appSignature: HexSchema,
  fee: z.bigint().optional(),
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
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

  const { comment, commentsContractAddress, fee } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsContractAddress,
    abi: CommentsV1Abi,
    functionName: "postCommentAsAuthor",
    args: [createCommentData(comment), params.appSignature],
    value: fee,
  });

  return {
    txHash,
  };
}

export type PostCommentParams = {
  /**
   * The comment data
   */
  comment: CreateCommentDataParams;
  /**
   * The author signature
   */
  authorSignature: Hex;
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
  commentsContractAddress?: Hex;
  /**
   * The write contract function
   */
  writeContract: ContractWriteFunctions["postComment"];
};

export type PostCommentResult = {
  txHash: Hex;
};

const PostCommentParamsSchema = z.object({
  comment: z.custom<CreateCommentDataParams>(() => true),
  authorSignature: HexSchema,
  appSignature: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
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

  const {
    comment,
    authorSignature,
    appSignature,
    commentsContractAddress,
    fee,
  } = validatedParams;

  const txHash = await params.writeContract({
    address: commentsContractAddress,
    abi: CommentsV1Abi,
    functionName: "postComment",
    args: [createCommentData(comment), authorSignature, appSignature],
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
  commentsContractAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentsV1Abi, "getComment">
  ) => Promise<ReadContractReturnType<typeof CommentsV1Abi, "getComment">>;
};

export type GetCommentResult = {
  comment: CommentData;
};

const GetCommentParamsSchema = z.object({
  commentId: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
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
  const { commentId, commentsContractAddress } =
    GetCommentParamsSchema.parse(params);

  const comment = await params.readContract({
    address: commentsContractAddress,
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
  commentsContractAddress?: Hex;
  readContract: ContractReadFunctions["getCommentId"];
};

const GetCommentIdParamsSchema = z.object({
  commentData: z.custom<CreateCommentDataParams>(() => true),
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get the ID for a comment before it is posted
 *
 * @param params - The parameters for getting a comment ID
 * @returns The comment ID
 */
export async function getCommentId(params: GetCommentIdParams): Promise<Hex> {
  const { commentData, commentsContractAddress } =
    GetCommentIdParamsSchema.parse(params);

  const commentId = await params.readContract({
    address: commentsContractAddress,
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
  commentsContractAddress?: Hex;
  writeContract: ContractWriteFunctions["deleteCommentAsAuthor"];
};

export type DeleteCommentAsAuthorResult = {
  txHash: Hex;
};

const DeleteCommentAsAuthorParamsSchema = z.object({
  commentId: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
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
  const { commentId, commentsContractAddress } =
    DeleteCommentAsAuthorParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: commentsContractAddress,
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
  commentsContractAddress?: Hex;
  /**
   * The author signature
   */
  authorSignature: Hex;
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
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
  authorSignature: HexSchema,
  appSignature: HexSchema,
});

/**
 * Delete a comment with author signature verification
 *
 * @param params - The parameters for deleting a comment
 * @returns The transaction hash
 */
export async function deleteComment(params: DeleteCommentParams) {
  const { commentId, commentsContractAddress } =
    DeleteCommentParamsSchema.parse(params);

  const txHash = await params.writeContract({
    address: commentsContractAddress,
    abi: CommentsV1Abi,
    functionName: "deleteComment",
    args: [
      commentId,
      params.author,
      params.appSigner,
      params.nonce,
      params.deadline,
      params.authorSignature,
      params.appSignature,
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
  commentsContractAddress?: Hex;
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
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
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
  const {
    commentId,
    author,
    appSigner,
    nonce,
    deadline,
    commentsContractAddress,
  } = GetDeleteCommentHashParamsSchema.parse(params);

  const hash = await params.readContract({
    address: commentsContractAddress,
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
  commentsContractAddress?: Hex;
  readContract: (
    parameters: ReadContractParameters<typeof CommentsV1Abi, "nonces">
  ) => Promise<ReadContractReturnType<typeof CommentsV1Abi, "nonces">>;
};

const GetNonceParamsSchema = z.object({
  author: HexSchema,
  appSigner: HexSchema,
  commentsContractAddress: HexSchema.default(COMMENTS_V1_ADDRESS),
});

/**
 * Get the nonce for the author and app signer
 *
 * @param params - The parameters for getting a nonce
 * @returns The nonce
 */
export async function getNonce(params: GetNonceParams): Promise<bigint> {
  const { author, appSigner, commentsContractAddress } =
    GetNonceParamsSchema.parse(params);

  const nonce = await params.readContract({
    address: commentsContractAddress,
    abi: CommentsV1Abi,
    functionName: "nonces",
    args: [author, appSigner],
  });

  return nonce;
}
