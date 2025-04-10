import {
  type SignCommentPayloadRequestSchemaType,
  SignCommentPayloadRequestSchema,
} from "@/lib/schemas";
import {
  SignCommentResponseClientSchema,
  type SignCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";
import { publicEnv } from "@/publicEnv";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  RateLimitedError,
  CommentFormSubmitError,
  InvalidCommentError,
} from "./errors";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";

export function createRootCommentsQueryKey(
  address: Hex | undefined,
  targetUri: string
) {
  return ["comments", address, targetUri];
}

export function createCommentRepliesQueryKey(
  address: Hex | undefined,
  commentId: Hex
) {
  return ["comments", address, commentId];
}

export class SubmitCommentMutationError extends Error {}

type SubmitCommentParams = {
  address: Hex | undefined;
  commentRequest: Omit<SignCommentPayloadRequestSchemaType, "author">;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signCommentResponse: SignCommentResponseClientSchemaType;
    chainId: number;
  }) => Promise<Hex>;
};

export async function submitCommentMutationFunction({
  address,
  commentRequest,
  switchChainAsync,
  writeContractAsync,
}: SubmitCommentParams): Promise<PendingPostCommentOperationSchemaType> {
  if (!address) {
    throw new SubmitCommentMutationError("Wallet not connected.");
  }

  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const parseResult = SignCommentPayloadRequestSchema.safeParse({
    ...commentRequest,
    author: address,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const commentData = parseResult.data;

  const switchedChain = await switchChainAsync(commentData.chainId);

  if (switchedChain.id !== commentData.chainId) {
    throw new SubmitCommentMutationError("Failed to switch chain.");
  }

  const response = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commentData),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new RateLimitedError();
    }

    if (response.status === 400) {
      throw new CommentFormSubmitError(await response.json());
    }

    throw new SubmitCommentMutationError(
      "Failed to obtain signed comment data, please try again."
    );
  }

  const signedCommentResult = SignCommentResponseClientSchema.safeParse(
    await response.json()
  );

  if (!signedCommentResult.success) {
    throw new SubmitCommentMutationError(
      "Server returned malformed signed comment data, please try again."
    );
  }

  try {
    const txHash = await writeContractAsync({
      signCommentResponse: signedCommentResult.data,
      chainId: commentData.chainId,
    });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId: commentData.chainId,
    };
  } catch (e) {
    if (
      e instanceof ContractFunctionExecutionError &&
      e.shortMessage.includes("User rejected the request.")
    ) {
      throw new SubmitCommentMutationError(
        "Could not post the comment because the transaction was rejected."
      );
    }

    console.error(e);

    throw new SubmitCommentMutationError(
      "Failed to post comment, please try again."
    );
  }
}
