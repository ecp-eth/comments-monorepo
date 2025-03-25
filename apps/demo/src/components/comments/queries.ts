import {
  type PendingCommentOperationSchemaType,
  type SignCommentPayloadRequestSchemaType,
  SignCommentPayloadRequestSchema,
  type PrepareGaslessCommentDeletionRequestBodySchemaType,
  type PrepareGaslessDeleteCommentOperationResponseSchemaType,
  PrepareGaslessDeleteCommentOperationResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  type PrepareSignedGaslessCommentRequestBodySchemaType,
  type PreparedGaslessPostCommentOperationApprovedSchemaType,
  type PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
} from "@/lib/schemas";
import { publicEnv } from "@/publicEnv";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  RateLimitedError,
  CommentFormSubmitError,
  InvalidCommentError,
} from "./errors";
import type { IndexerAPIAuthorDataSchemaType } from "@ecp.eth/sdk/schemas";
import { chain } from "@/lib/wagmi";
import {
  SignCommentResponseClientSchema,
  type SignCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";

export class SubmitCommentMutationError extends Error {}

type SubmitCommentParams = {
  address: Hex | undefined;
  commentRequest: Omit<SignCommentPayloadRequestSchemaType, "author">;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (
    params: SignCommentResponseClientSchemaType
  ) => Promise<Hex>;
};

export async function submitCommentMutationFunction({
  address,
  commentRequest,
  switchChainAsync,
  writeContractAsync,
}: SubmitCommentParams): Promise<PendingCommentOperationSchemaType> {
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

  const switchedChain = await switchChainAsync(chain.id);

  if (switchedChain.id !== chain.id) {
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
    const txHash = await writeContractAsync(signedCommentResult.data);

    return {
      response: signedCommentResult.data,
      txHash,
      chainId: chain.id,
      resolvedAuthor,
      type: "non-gasless",
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

async function gaslessDeleteComment(
  params: PrepareGaslessCommentDeletionRequestBodySchemaType
): Promise<PrepareGaslessDeleteCommentOperationResponseSchemaType> {
  const response = await fetch(`/api/delete-comment/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to delete comment");
  }

  return PrepareGaslessDeleteCommentOperationResponseSchema.parse(
    await response.json()
  );
}

/**
 * Delete a comment that was previously approved, so not need for
 * user approval for signature for each interaction
 */
export async function deletePriorApprovedCommentMutationFunction({
  address,
  commentId,
}: {
  address: Hex;
  commentId: Hex;
}) {
  const result = await gaslessDeleteComment({
    author: address,
    commentId,
    submitIfApproved: true,
  });

  return PreparedSignedGaslessDeleteCommentApprovedResponseSchema.parse(result);
}

/**
 * Delete a comment that was previously NOT approved,
 * will require user interaction for signature
 */
export async function deletePriorNotApprovedCommentMutationFunction({
  address,
  commentId,
}: {
  address: Hex;
  commentId: Hex;
}) {
  const result = await gaslessDeleteComment({
    author: address,
    commentId,
    submitIfApproved: false,
  });

  return PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema.parse(
    result
  );
}

export type PreparedGaslessPostCommentOperationApprovedResult =
  PreparedGaslessPostCommentOperationApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export type PreparedGaslessPostCommentOperationNotApprovedResult =
  PreparedSignedGaslessPostCommentNotApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export async function prepareSignedGaslessComment(
  submitIfApproved: true,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<PreparedGaslessPostCommentOperationApprovedResult>;
export async function prepareSignedGaslessComment(
  submitIfApproved: false,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<PreparedGaslessPostCommentOperationNotApprovedResult>;

export async function prepareSignedGaslessComment(
  submitIfApproved: boolean,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<
  | PreparedGaslessPostCommentOperationApprovedResult
  | PreparedGaslessPostCommentOperationNotApprovedResult
> {
  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address: body.author,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const response = await fetch("/api/sign-comment/gasless/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      submitIfApproved,
    } satisfies PrepareSignedGaslessCommentRequestBodySchemaType),
  });

  if (!response.ok) {
    throw new Error("Failed to sign comment");
  }

  const data = await response.json();

  if (submitIfApproved) {
    const parsed =
      PreparedGaslessPostCommentOperationApprovedResponseSchema.parse(data);

    return {
      ...parsed,
      resolvedAuthor,
    };
  }

  const parsed =
    PreparedSignedGaslessPostCommentNotApprovedResponseSchema.parse(data);

  return {
    ...parsed,
    resolvedAuthor,
  };
}
