import {
  type SignCommentPayloadRequestSchemaType,
  SignCommentPayloadRequestSchema,
  SignEditCommentPayloadRequestSchema,
  SignEditCommentPayloadRequestSchemaType,
} from "@/lib/schemas";
import {
  SignCommentResponseClientSchema,
  SignEditCommentResponseClientSchema,
  type SignCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";
import { publicEnv } from "@/publicEnv";
import {
  fetchAuthorData,
  type IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  RateLimitedError,
  CommentFormSubmitError,
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type {
  Comment,
  PendingEditCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
  SignEditCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";
import { DistributiveOmit } from "@tanstack/react-query";

export function createRootCommentsQueryKey(
  address: Hex | undefined,
  chainId: number,
  targetUri: string,
) {
  return ["comments", address, chainId, targetUri];
}

export function createCommentRepliesQueryKey(
  address: Hex | undefined,
  chainId: number,
  commentId: Hex,
) {
  return ["comments", address, chainId, commentId];
}

export class SubmitCommentMutationError extends Error {}
export class SubmitEditCommentMutationError extends Error {}

type SubmitCommentParams = {
  author: Hex | undefined;
  commentRequest: DistributiveOmit<
    SignCommentPayloadRequestSchemaType,
    "author"
  >;
  references: IndexerAPICommentReferencesSchemaType;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signCommentResponse: SignCommentResponseClientSchemaType;
    chainId: number;
  }) => Promise<Hex>;
};

export async function submitCommentMutationFunction({
  author,
  commentRequest,
  references,
  switchChainAsync,
  writeContractAsync,
}: SubmitCommentParams): Promise<PendingPostCommentOperationSchemaType> {
  if (!author) {
    throw new SubmitCommentMutationError("Wallet not connected.");
  }

  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address: author,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const parseResult = SignCommentPayloadRequestSchema.safeParse({
    ...commentRequest,
    author,
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
    await throwKnownResponseCodeError(response);

    throw new SubmitCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignCommentResponseClientSchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
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
      references,
    };
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      if (e.shortMessage.includes("User rejected the request.")) {
        throw new SubmitCommentMutationError(
          "Could not post the comment because the transaction was rejected.",
        );
      }

      throw new SubmitCommentMutationError(e.details);
    }

    console.error(e);

    throw new SubmitCommentMutationError(
      "Failed to post comment, please try again.",
    );
  }
}

type SubmitEditCommentParams = {
  address: Hex | undefined;
  comment: Comment;
  editRequest: Omit<
    SignEditCommentPayloadRequestSchemaType,
    "author" | "metadata" | "commentId"
  >;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signEditCommentResponse: SignEditCommentResponseClientSchemaType;
    chainId: number;
  }) => Promise<Hex>;
};

export async function submitEditCommentMutationFunction({
  address,
  comment,
  editRequest,
  switchChainAsync,
  writeContractAsync,
}: SubmitEditCommentParams): Promise<PendingEditCommentOperationSchemaType> {
  if (!address) {
    throw new SubmitEditCommentMutationError("Wallet not connected.");
  }

  const parseResult = SignEditCommentPayloadRequestSchema.safeParse({
    author: address,
    commentId: comment.id,
    content: editRequest.content,
    metadata: comment.metadata,
    chainId: editRequest.chainId,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const commentData = parseResult.data;

  const switchedChain = await switchChainAsync(editRequest.chainId);

  if (switchedChain.id !== editRequest.chainId) {
    throw new SubmitEditCommentMutationError("Failed to switch chain.");
  }

  const response = await fetch("/api/sign-edit-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commentData),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitEditCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignEditCommentResponseClientSchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitEditCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  try {
    const txHash = await writeContractAsync({
      signEditCommentResponse: signedCommentResult.data,
      chainId: editRequest.chainId,
    });

    return {
      txHash,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "edit",
      state: { status: "pending" },
      chainId: editRequest.chainId,
    };
  } catch (e) {
    if (e instanceof ContractFunctionExecutionError) {
      if (e.shortMessage.includes("User rejected the request.")) {
        throw new SubmitEditCommentMutationError(
          "Could not edit the comment because the transaction was rejected.",
        );
      }

      throw new SubmitEditCommentMutationError(e.details);
    }

    console.error(e);

    throw new SubmitEditCommentMutationError(
      "Failed to edit comment, please try again.",
    );
  }
}
