import { Effect } from "effect";
import { WalletClient } from "viem";
import type {
  SignCommentRequest,
  SignCommentGaslessPrepareResponse,
  SignCommentGaslessResponse,
  SignCommentResponse,
  Hex,
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
};

/**
 * Signs comment using app signer key and returns signed data that should be written by comment's author.
 */
export async function signCommentForPostingAsAuthor({
  comment,
  chainId,
  apiUrl,
  retries = 3,
}: SignCommentForPostingAsAuthorOptions): Promise<SignCommentResponse> {
  const sendCommentTask = Effect.tryPromise(async () => {
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
  const prepareCommentTask = Effect.tryPromise(async () => {
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

  const repeatableTask = Effect.retry(prepareCommentTask, {
    times: retries,
  });

  return Effect.runPromise(repeatableTask);
}
