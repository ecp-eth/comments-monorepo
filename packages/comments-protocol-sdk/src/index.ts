import { Effect } from "effect";
import { walletActions, WalletClient } from "viem";
import type {
  SignCommentRequest,
  SignCommentGaslessPrepareResponse,
  SignCommentGaslessResponse,
  SignCommentResponse,
  Hex,
  PostingCommentsOnUsersBehalfApprovalStatusResponse,
  ApprovePostingCommentsOnUsersBehalfResponse,
} from "./types.js";
import { CommentsV1Abi } from "./abis.js";

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
  commentsContractAddress: Hex;
};

/**
 * Posts a signed comment as an author.
 *
 * This operations uses user's funds to pay for gas fees.
 */
export async function postCommentAsAuthor({
  signedComment,
  commentsContractAddress,
  chainId,
  wallet,
}: PostCommentAsAuthor): Promise<Hex> {
  const writeCommentTask = Effect.tryPromise(async () => {
    await wallet.switchChain({ id: chainId });

    const result = await wallet.writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: commentsContractAddress,
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

type FetchPostCommentOnUsersBehalfApprovalStatusOptions = {
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

export async function fetchPostCommentsOnUsersBehalfApprovalStatus({
  apiUrl,
  author,
  retries = 3,
}: FetchPostCommentOnUsersBehalfApprovalStatusOptions): Promise<PostingCommentsOnUsersBehalfApprovalStatusResponse> {
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

    const responseData: PostingCommentsOnUsersBehalfApprovalStatusResponse =
      await response.json();

    return responseData;
  });

  const repeatableTask = Effect.retry(fetchStatusTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}

type ApprovePostingCommentsOnUsersBehalfOptions = {
  apiUrl: string;
  statusResponse: PostingCommentsOnUsersBehalfApprovalStatusResponse;
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
  commentsContractAddress: Hex;
  wallet: WalletClient;
};

export async function deleteCommentAsAuthor({
  commentId,
  commentsContractAddress,
  wallet,
}: DeleteCommentOptions): Promise<Hex> {
  const deleteCommentTask = Effect.tryPromise(async () => {
    const txHash = await wallet.writeContract({
      account: null, // use current account
      chain: null, // use current chain
      abi: CommentsV1Abi,
      address: commentsContractAddress,
      functionName: "deleteCommentAsAuthor",
      args: [commentId],
    });

    return txHash;
  });

  return Effect.runPromise(deleteCommentTask);
}
