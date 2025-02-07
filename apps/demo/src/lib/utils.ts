import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CommentData } from "./types";
import { COMMENTS_V1_CONTRACT_ADDRESS } from "@ecp.eth/sdk";
import {
  DOMAIN_NAME,
  DOMAIN_VERSION,
  COMMENT_TYPE,
  ADD_APPROVAL_TYPE,
  DELETE_COMMENT_TYPE,
} from "./eip712";
import { Chain, createPublicClient, http, Transport } from "viem";
import { CommentsV1Abi } from "../../../../packages/sdk/dist/abis";
import type { Hex } from "@ecp.eth/sdk/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function bigintReplacer(key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

export function createCommentData({
  content,
  targetUri,
  metadata,
  parentId,
  author,
  appSigner,
  nonce,
  deadline,
}: {
  /** The content of the comment */
  content: string;
  /** Metadata about the comment */
  metadata?: object;
  /** The URI of the page the comment is about */
  targetUri?: string;
  /** The ID of the parent comment */
  parentId?: Hex;
  /** The address of the author of the comment */
  author: Hex;
  /** The address of the app signer */
  appSigner: Hex;
  /** The current nonce of the user on the chain */
  nonce: bigint;
  /** The deadline of the comment submission in seconds since epoch */
  deadline?: bigint;
}): CommentData {
  return {
    content,
    metadata: metadata ? JSON.stringify(metadata) : "",
    targetUri: targetUri ?? "",
    parentId:
      parentId ??
      "0x0000000000000000000000000000000000000000000000000000000000000000",
    author,
    appSigner,
    nonce,
    deadline: deadline ?? BigInt(Math.floor(Date.now() / 1000) + 60 * 60 * 24), // 1 day
  };
}

export function createCommentSignTypedDataArgs({
  commentData,
  chainId,
}: {
  commentData: CommentData;
  chainId: number;
}) {
  return {
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_CONTRACT_ADDRESS,
    },
    types: COMMENT_TYPE,
    primaryType: "AddComment",
    message: commentData,
  } as const;
}

export function createApprovalSignTypedDataArgs({
  author,
  appSigner,
  nonce,
  deadline,
  chainId,
}: {
  author: Hex;
  appSigner: Hex;
  chainId: number;
  nonce: bigint;
  deadline?: bigint;
}) {
  return {
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_CONTRACT_ADDRESS,
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
  } as const;
}

export async function getNonce({
  author,
  chain,
  transport,
}: {
  author: Hex;
  chain: Chain;
  transport?: Transport;
}) {
  const publicClient = createPublicClient({
    chain,
    transport: transport ?? http(),
  });

  const nonce = await publicClient.readContract({
    address: COMMENTS_V1_CONTRACT_ADDRESS,
    abi: CommentsV1Abi,
    functionName: "nonces",
    args: [author],
  });

  return nonce;
}

export function createDeleteCommentTypedDataArgs({
  commentId,
  chainId,
  author,
  appSigner,
  nonce,
  deadline,
}: {
  commentId: Hex;
  chainId: number;
  author: Hex;
  appSigner: Hex;
  nonce: bigint;
  deadline?: bigint;
}) {
  return {
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId,
      verifyingContract: COMMENTS_V1_CONTRACT_ADDRESS,
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
  } as const;
}
