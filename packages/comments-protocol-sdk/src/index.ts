import { Effect } from "effect";
import type { WalletClient } from "viem";
import type {
  SignCommentRequest,
  SignCommentGaslessPrepareResponse,
  SignCommentGaslessResponse,
  SignCommentResponse,
  Hex,
  AppApprovalStatusResponse,
  ApprovePostingCommentsOnUsersBehalfResponse,
  FetchCommentsResponse,
} from "./types.js";
import { CommentsV1Abi } from "./abis.js";
import { COMMENTS_V1_CONTRACT_ADDRESS } from "./constants.js";

type SignCommentForPostingAsAuthorOptions = {
  comment: SignCommentRequest;
  /**
   * URL of comments api server.
   */
  apiUrl: string;
  chainId: number;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
  wallet: WalletClient;
};

/**
 * Signs comment using app signer key and returns signed data that should be written by comment's author.
 */
export async function signCommentForPostingAsAuthor({
  comment,
  chainId,
  apiUrl,
  retries = 3,
  wallet,
}: SignCommentForPostingAsAuthorOptions): Promise<SignCommentResponse> {
  const sendCommentTask = Effect.tryPromise(async () => {
    await wallet.switchChain({ id: chainId });

    const response = await fetch(new URL("/api/sign-comment", apiUrl), {
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

type PostCommentAsAuthor = {
  signedComment: SignCommentResponse;
  chainId: number;
  wallet: WalletClient;
};

/**
 * Posts a signed comment as an author.
 *
 * This operations uses user's funds to pay for gas fees.
 */
export async function postCommentAsAuthor({
  signedComment,
  chainId,
  wallet,
}: PostCommentAsAuthor): Promise<Hex> {
  const writeCommentTask = Effect.tryPromise(async () => {
    await wallet.switchChain({ id: chainId });

    const result = await wallet.writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "postCommentAsAuthor",
      args: [
        {
          ...signedComment.data,
          deadline: BigInt(signedComment.data.deadline),
        },
        signedComment.signature,
      ],
    });

    return result;
  });

  return Effect.runPromise(writeCommentTask);
}

type PrepareCommentForGaslessPostingOptions = {
  comment: SignCommentRequest;
  apiUrl: string;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function prepareCommentForGaslessPosting({
  comment,
  apiUrl,
  retries = 3,
}: PrepareCommentForGaslessPostingOptions): Promise<
  SignCommentGaslessPrepareResponse | SignCommentGaslessResponse
> {
  const prepareCommentTask = Effect.tryPromise(async () => {
    const response = await fetch(
      new URL("/api/sign-comment/gasless/prepare", apiUrl),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...comment,
          submitIfApproved: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to sign comment: ${response.statusText}`);
    }

    const responseData:
      | SignCommentGaslessPrepareResponse
      | SignCommentGaslessResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(prepareCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type PostPreparedGaslessCommentOptions = {
  authorSignature: Hex;
  preparedComment: SignCommentGaslessPrepareResponse;
  apiUrl: string;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export function postPreparedGaslessComment({
  apiUrl,
  authorSignature,
  preparedComment,
  retries = 3,
}: PostPreparedGaslessCommentOptions): Promise<SignCommentGaslessResponse> {
  const postCommentTask = Effect.tryPromise(async () => {
    const response = await fetch(new URL("/api/sign-comment/gasless", apiUrl), {
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

    const responseData: SignCommentGaslessResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(postCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type FetchAppApprovalStatusOptions = {
  /**
   * Wallet address of commenter.
   */
  author: Hex;
  apiUrl: string;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function fetchAppApprovalStatus({
  apiUrl,
  author,
  retries = 3,
}: FetchAppApprovalStatusOptions): Promise<AppApprovalStatusResponse> {
  const fetchStatusTask = Effect.tryPromise(async () => {
    const endpointUrl = new URL("/api/approval", apiUrl);

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

    const responseData: AppApprovalStatusResponse = await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchStatusTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type ApprovePostingCommentsOnUsersBehalfOptions = {
  apiUrl: string;
  statusResponse: AppApprovalStatusResponse;
  authorSignature: Hex;
  /**
   * Number of times to retry the signing operation in case of failure.
   *
   * @default 3
   */
  retries?: number;
};

export async function approvePostingCommentsOnUsersBehalf({
  apiUrl,
  statusResponse,
  authorSignature,
  retries = 3,
}: ApprovePostingCommentsOnUsersBehalfOptions): Promise<Hex> {
  const postApprovalTask = Effect.tryPromise(async () => {
    if (statusResponse.approved) {
      throw new Error(
        "App is already approved to post comments on user's behalf"
      );
    }

    const response = await fetch(new URL("/api/approval", apiUrl), {
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

    const responseData: ApprovePostingCommentsOnUsersBehalfResponse =
      await response.json();

    return responseData.txHash;
  });

  const repeatableTask = Effect.retry(postApprovalTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type DeleteCommentOptions = {
  commentId: Hex;
  wallet: WalletClient;
};

export async function deleteCommentAsAuthor({
  commentId,
  wallet,
}: DeleteCommentOptions): Promise<Hex> {
  const deleteCommentTask = Effect.tryPromise(async () => {
    const txHash = await wallet.writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: COMMENTS_V1_CONTRACT_ADDRESS,
      functionName: "deleteCommentAsAuthor",
      args: [commentId],
    });

    return txHash;
  });

  return Effect.runPromise(deleteCommentTask);
}

type FetchCommentsOptions = {
  targetUri: string;
  /**
   * URL on which /api/comments endpoint will be called
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

export async function fetchComments({
  apiUrl,
  targetUri,
  appSigner,
  sort = "desc",
  offset = 0,
  limit = 50,
  retries = 3,
}: FetchCommentsOptions): Promise<FetchCommentsResponse> {
  const fetchCommentsTask = Effect.tryPromise(async () => {
    const url = new URL("/api/comments", apiUrl);
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

export async function fetchCommentReplies({
  apiUrl,
  appSigner,
  commentId,
  retries = 3,
  offset = 0,
  limit = 50,
}: FetchCommentRepliesOptions): Promise<FetchCommentsResponse> {
  const fetchRepliesTask = Effect.tryPromise(async () => {
    const url = new URL(`/api/comments/${commentId}/replies`, apiUrl);

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
