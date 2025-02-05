import { Effect } from "effect";
import { type Chain, WalletClient } from "viem";
import type { CommentData, Hex } from "./types.js";
import { CommentsV1Abi } from "./abis.js";

type SignCommentRequest = {
  content: string;
  targetUrl?: string;
  parentId?: Hex;
  author: Hex;
};

type SignCommentResponse = {
  signature: Hex;
  hash: Hex;
  data: CommentData;
};

type SignCommentForPostingAsAuthorOptions = {
  comment: SignCommentRequest;
  chainId: number;
  /**
   * URL of comments api server.
   */
  apiUrl: string;
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
      body: JSON.stringify(comment),
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
  account: Hex;
  signedComment: SignCommentResponse;
  chain: Chain;
  wallet: WalletClient;
  commentsContractAddress: Hex;
};

/**
 * Posts a signed comment as an author.
 *
 * This operations uses user's funds to pay for gas fees.
 */
export async function postCommentAsAuthor({
  account,
  signedComment,
  commentsContractAddress,
  chain,
  wallet,
}: PostCommentAsAuthor): Promise<Hex> {
  const writeCommentTask = Effect.tryPromise(async () => {
    const result = await wallet.writeContract({
      account,
      chain,
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
