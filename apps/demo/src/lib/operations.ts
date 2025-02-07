import type {
  CommentData,
  Hex,
} from "@modprotocol/comments-protocol-sdk/types";
import {
  HexSchema,
  type CommentInputSchemaType,
  CommentInputSchema,
  type SignCommentByAppRequestSchemaType,
  type GaslessCommentSignatureResponseSchemaType,
  GaslessCommentSignatureResponseSchema,
  SignGaslessCommentApprovedResponseSchema,
  type SignGaslessCommentApprovedResponseSchemaType,
  type SignGaslessCommentRequiresSigningResponseSchemaType,
  AppNotApprovedStatusResponseSchemaType,
  AppApprovalStatusResponseSchemaType,
  AppApprovalStatusResponseSchema,
} from "@modprotocol/comments-protocol-sdk/schemas";
import { Effect } from "effect";
import { z } from "zod";

type SignCommentResponse = {
  chainId: number;
  signature: Hex;
  hash: Hex;
  data: CommentData;
};

type SignCommentForPostingAsAuthorOptions = {
  comment: SignCommentByAppRequestSchemaType;
  chainId: number;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

/**
 * Signs comment using app signer key and returns signed data that should be written by comment's author.
 */
export async function signCommentForPostingAsAuthor({
  comment,
  chainId,
  retries = 3,
}: SignCommentForPostingAsAuthorOptions): Promise<SignCommentResponse> {
  const sendCommentTask = Effect.tryPromise(async () => {
    const response = await fetch("/api/sign-comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...comment, chainId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign comment: ${response.statusText}`);
    }

    const responseData: SignCommentResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(sendCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type PrepareCommentForGaslessPostingOptions = {
  comment: CommentInputSchemaType;
  submitIfApproved: boolean;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function prepareCommentForGaslessPosting({
  comment,
  submitIfApproved,
  retries = 3,
}: PrepareCommentForGaslessPostingOptions): Promise<GaslessCommentSignatureResponseSchemaType> {
  const prepareCommentTask = Effect.tryPromise(async () => {
    const data = CommentInputSchema.parse(comment);
    const response = await fetch("/api/sign-comment/gasless/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...data,
        submitIfApproved,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign comment: ${response.statusText}`);
    }

    return GaslessCommentSignatureResponseSchema.parse(await response.json());
  });

  const repeatableTask = Effect.retry(prepareCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type PostPreparedGaslessCommentOptions = {
  authorSignature: Hex;
  preparedComment: SignGaslessCommentRequiresSigningResponseSchemaType;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export function postPreparedGaslessComment({
  authorSignature,
  preparedComment,
  retries = 3,
}: PostPreparedGaslessCommentOptions): Promise<Hex> {
  const postCommentTask = Effect.tryPromise(async () => {
    const response = await fetch("/api/sign-comment/gasless", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        commentData: preparedComment.signTypedDataArgs.message,
        appSignature: preparedComment.appSignature,
        authorSignature: authorSignature,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign comment: ${response.statusText}`);
    }

    const responseSchema = z.object({
      txHash: HexSchema,
    });

    const responseData = responseSchema.parse(await response.json());

    return responseData.txHash;
  });

  const repeatableTask = Effect.retry(postCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type ApprovePostingCommentsOnUsersBehalfOptions = {
  statusResponse: AppNotApprovedStatusResponseSchemaType;
  authorSignature: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function approvePostingCommentsOnUsersBehalf({
  statusResponse,
  authorSignature,
  retries = 3,
}: ApprovePostingCommentsOnUsersBehalfOptions): Promise<Hex> {
  const postApprovalTask = Effect.tryPromise(async () => {
    const response = await fetch("/api/approval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signTypedDataArgs: statusResponse.signTypedDataArgs,
        appSignature: statusResponse.appSignature,
        authorSignature,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to approve posting comments: ${response.statusText}`
      );
    }

    const responseSchema = z.object({
      txHash: HexSchema,
    });

    const approvedResponse = responseSchema.parse(await response.json());

    return approvedResponse.txHash;
  });

  const repeatableTask = Effect.retry(postApprovalTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type PrepareCommentForGaslessDeletionOptions = {
  commentId: Hex;
  author: Hex;
  /**
   * Performs the deletion if user approved the app to act on their behalf.
   *
   * @default true
   */
  submitIfApproved?: boolean;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function prepareCommentForGaslessDeletion({
  author,
  commentId,
  submitIfApproved = true,
  retries = 3,
}: PrepareCommentForGaslessDeletionOptions): Promise<GaslessCommentSignatureResponseSchemaType> {
  const prepareCommentForDeletionTask = Effect.tryPromise(async () => {
    const response = await fetch("/api/delete-comment/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author,
        commentId,
        submitIfApproved,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to sign comment: ${response.statusText}`);
    }

    return GaslessCommentSignatureResponseSchema.parse(await response.json());
  });

  const repeatableTask = Effect.retry(prepareCommentForDeletionTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type PerformGalessCommentDeletionOptions = {
  request: SignGaslessCommentRequiresSigningResponseSchemaType;
  authorSignature: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function performGaslessCommentDeletion({
  authorSignature,
  request,
  retries = 3,
}: PerformGalessCommentDeletionOptions): Promise<SignGaslessCommentApprovedResponseSchemaType> {
  const deleteCommentTask = Effect.tryPromise(async () => {
    const response = await fetch("/api/delete-comment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        authorSignature,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to post approval signature: ${response.statusText}`
      );
    }

    return SignGaslessCommentApprovedResponseSchema.parse(
      await response.json()
    );
  });

  const repeatableTask = Effect.retry(deleteCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type FetchAppApprovalStatusOptions = {
  /**
   * Wallet address of commenter.
   */
  author: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function fetchAppApprovalStatus({
  author,
  retries = 3,
}: FetchAppApprovalStatusOptions): Promise<AppApprovalStatusResponseSchemaType> {
  const fetchStatusTask = Effect.tryPromise(async () => {
    const endpointUrl = new URL("/api/approval", window.location.href);

    endpointUrl.searchParams.set("author", author);

    const response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch approval status: ${response.statusText}`
      );
    }

    return AppApprovalStatusResponseSchema.parse(await response.json());
  });

  const repeatableTask = Effect.retry(fetchStatusTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type FetchCommentRepliesOptions = {
  commentId: Hex;
  /**
   * URL on which /api/comments/$commentId/replies endpoint will be called
   */
  apiUrl: string;
  /**
   * Filters only to comments sent using this app signer key.
   */
  appSigner?: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * @default "desc"
   */
  sort?: "asc" | "desc";
  /**
   *
   * @default 0
   */
  offset?: number;
  /**
   * @default 50
   */
  limit?: number;
};

export type Comment = {
  timestamp: Date;
  id: Hex;
  content: string;
  metadata: string;
  targetUri: string | null;
  parentId: Hex | null;
  author: Hex;
  chainId: number;
  deletedAt: Date | null;
  appSigner: Hex;
  txHash: Hex;
  logIndex: number;
  replies: Comment[];
};

export type FetchCommentsResponse = {
  results: Comment[];
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export async function fetchCommentReplies({
  appSigner,
  commentId,
  retries = 3,
  offset = 0,
  limit = 50,
}: FetchCommentRepliesOptions): Promise<FetchCommentsResponse> {
  const fetchRepliesTask = Effect.tryPromise(async () => {
    const url = new URL(
      `/api/comments/${commentId}/replies`,
      window.location.href
    );

    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch replies: ${response.statusText}`);
    }

    const responseData: FetchCommentsResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchRepliesTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type FetchCommentsOptions = {
  targetUri: string;
  /**
   * Filters only to comments sent using this app signer key.
   */
  appSigner?: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  /**
   * @default "desc"
   */
  sort?: "asc" | "desc";
  /**
   *
   * @default 0
   */
  offset?: number;
  /**
   * @default 50
   */
  limit?: number;
};

export async function fetchComments({
  targetUri,
  appSigner,
  sort = "desc",
  offset = 0,
  limit = 50,
  retries = 3,
}: FetchCommentsOptions): Promise<FetchCommentsResponse> {
  const fetchCommentsTask = Effect.tryPromise(async () => {
    const url = new URL("/api/comments", window.location.href);
    url.searchParams.set("targetUri", targetUri);
    url.searchParams.set("sort", sort);
    url.searchParams.set("offset", offset.toString());
    url.searchParams.set("limit", limit.toString());

    if (appSigner) {
      url.searchParams.set("appSigner", appSigner);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch comments: ${response.statusText}`);
    }

    const responseData: FetchCommentsResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchCommentsTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}
