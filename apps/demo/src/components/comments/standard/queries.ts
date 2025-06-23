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
  type IndexerAPICommentZeroExSwapSchemaType,
} from "@ecp.eth/sdk/indexer";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  RateLimitedError,
  CommentFormSubmitError,
  InvalidCommentError,
} from "../core/errors";
import { chain } from "@/lib/wagmi";
import type {
  Comment,
  PendingEditCommentOperationSchemaType,
  PendingPostCommentOperationSchemaType,
  SignEditCommentResponseClientSchemaType,
} from "@ecp.eth/shared/schemas";
import { DistributiveOmit } from "@ecp.eth/shared/types";

export class SubmitCommentMutationError extends Error {}
export class SubmitEditCommentMutationError extends Error {}

type SubmitCommentParams = {
  /**
   * The address of the wallet that is submitting the comment.
   */
  address: Hex | undefined;
  commentRequest: DistributiveOmit<
    SignCommentPayloadRequestSchemaType,
    "author"
  >;
  zeroExSwap: IndexerAPICommentZeroExSwapSchemaType | null;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: (params: {
    signCommentResponse: SignCommentResponseClientSchemaType;
    chainId: number;
  }) => Promise<Hex>;
  references: IndexerAPICommentReferencesSchemaType;
};

export async function submitCommentMutationFunction({
  address,
  commentRequest,
  switchChainAsync,
  writeContractAsync,
  zeroExSwap,
  references,
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
      chainId: chain.id,
    });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId: chain.id,
      zeroExSwap: zeroExSwap ?? undefined,
      references,
    };
  } catch (e) {
    if (
      e instanceof ContractFunctionExecutionError &&
      e.shortMessage.includes("User rejected the request.")
    ) {
      throw new SubmitCommentMutationError(
        "Could not post the comment because the transaction was rejected.",
      );
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
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const commentData = parseResult.data;

  const switchedChain = await switchChainAsync(chain.id);

  if (switchedChain.id !== chain.id) {
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
    if (response.status === 429) {
      throw new RateLimitedError();
    }

    if (response.status === 400) {
      throw new CommentFormSubmitError(await response.json());
    }

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
      chainId: chain.id,
    });

    return {
      txHash,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "edit",
      state: { status: "pending" },
      chainId: chain.id,
    };
  } catch (e) {
    if (
      e instanceof ContractFunctionExecutionError &&
      e.shortMessage.includes("User rejected the request.")
    ) {
      throw new SubmitEditCommentMutationError(
        "Could not edit the comment because the transaction was rejected.",
      );
    }

    console.error(e);

    throw new SubmitEditCommentMutationError(
      "Failed to edit comment, please try again.",
    );
  }
}
