import {
  Chain,
  concat,
  createPublicClient,
  encodeAbiParameters,
  Hex,
  numberToHex,
  Transport,
} from "viem";
import { http } from "wagmi";
import { CommentsV1Abi } from "./abis.js";
import {
  COMMENT_CALLDATA_SUFFIX_DELIMITER,
  COMMENTS_V1_ADDRESS,
} from "./constants.js";
import {
  ADD_APPROVAL_TYPE,
  COMMENT_TYPE,
  DELETE_COMMENT_TYPE,
  DOMAIN_NAME,
  DOMAIN_VERSION,
} from "./eip712.js";
import {
  AddCommentTypedDataSchema,
  type AddCommentTypedDataSchemaType,
  CommentDataSchema,
  type CommentData,
  DeleteCommentTypedDataSchema,
  type DeleteCommentTypedDataSchemaType,
  AddApprovalTypedDataSchema,
  type AddApprovalTypedDataSchemaType,
} from "./schemas.js";

/**
 * Create the data structure of a comment
 * @return {CommentData} The data structure of a comment
 */
export function createCommentData({
  content,
  targetUri,
  metadata,
  parentId,
  author,
  appSigner,
  salt,
  deadline,
}: {
  /** The content of the comment */
  content: string;
  /** Metadata about the comment */
  metadata?: object;
  /** The URI of the page the comment is about */
  targetUri?: string;
  /** The ID of the parent comment */
  parentId?: `0x${string}`;
  /** The address of the author of the comment */
  author: `0x${string}`;
  /** The address of the app signer */
  appSigner: `0x${string}`;
  /** The current nonce of the user on the chain */
  salt?: `0x${string}`;
  /** The deadline of the comment submission in seconds since epoch */
  deadline?: bigint;
}): CommentData {
  return CommentDataSchema.parse({
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: targetUri ?? "",
    parentId:
      parentId ??
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author,
    appSigner,
    salt: salt ?? numberToHex(Math.floor(Date.now() / 1000)),
    deadline: deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day
  });
}

/**
 * Create the EIP-712 typed data structure for adding comment
 * @returns The typed data
 */
export function createCommentTypedData({
  commentData,
  chainId,
}: {
  commentData: CommentData;
  chainId: number;
}): AddCommentTypedDataSchemaType {
  return AddCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
    },
    types: COMMENT_TYPE,
    primaryType: "AddComment",
    message: commentData,
  });
}

export function createCommentSuffixData({
  commentData,
}: {
  commentData: CommentData;
}) {
  const parts: Hex[] = [COMMENT_CALLDATA_SUFFIX_DELIMITER];

  const encodedCommentData = encodeAbiParameters(COMMENT_TYPE.AddComment, [
    commentData.content,
    commentData.metadata,
    commentData.targetUri,
    commentData.parentId,
    commentData.author,
    commentData.appSigner,
    commentData.salt,
    commentData.deadline,
  ]);

  parts.push(encodedCommentData);

  return concat(parts);
}

/**
 * Create the EIP-712 typed data structure for approving comment
 * @returns The typed data
 */
export function createApprovalTypedData({
  author,
  appSigner,
  nonce,
  deadline,
  chainId,
}: {
  author: `0x${string}`;
  appSigner: `0x${string}`;
  chainId: number;
  nonce: bigint;
  deadline?: bigint;
}): AddApprovalTypedDataSchemaType {
  return AddApprovalTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
    },
    types: ADD_APPROVAL_TYPE,
    primaryType: "AddApproval",
    message: {
      author,
      appSigner,
      nonce,
      deadline:
        deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day from now
    },
  });
}

/**
 * Read the nonce from CommentsV1 contract for a given author and app signer
 * @returns The nonce for the given author and app signer
 */
export async function getNonce({
  author,
  appSigner,
  chain,
  transport,
}: {
  author: `0x${string}`;
  appSigner: `0x${string}`;
  chain: Chain;
  transport?: Transport;
}) {
  const publicClient = createPublicClient({
    chain,
    transport: transport ?? http(),
  });

  const nonce = await publicClient.readContract({
    address: COMMENTS_V1_ADDRESS,
    abi: CommentsV1Abi,
    functionName: "nonces",
    args: [author, appSigner],
  });

  return nonce;
}

/**
 * Create the EIP-712 typed data structure for deleting comment
 * @returns The typed data
 */
export function createDeleteCommentTypedData({
  commentId,
  chainId,
  author,
  appSigner,
  nonce,
  deadline,
}: {
  commentId: `0x${string}`;
  chainId: number;
  author: `0x${string}`;
  appSigner: `0x${string}`;
  nonce: bigint;
  deadline?: bigint;
}): DeleteCommentTypedDataSchemaType {
  return DeleteCommentTypedDataSchema.parse({
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_ADDRESS,
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
