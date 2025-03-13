import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import {
  SignCommentResponseClientSchema,
  type SignCommentResponseClientSchemaType,
  type PendingCommentOperationSchemaType,
  type SignCommentPayloadRequestSchemaType,
} from "@/lib/schemas";
import { publicEnv } from "@/publicEnv";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";

export class SubmitCommentMutationError extends Error {}

export class SubmitCommentMutationValidationError extends Error {}

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
  const content = commentRequest.content.trim();

  if (!content) {
    throw new SubmitCommentMutationValidationError("Comment cannot be empty.");
  }

  if (content.length > MAX_COMMENT_LENGTH) {
    throw new SubmitCommentMutationValidationError(
      `Comment cannot be longer than ${MAX_COMMENT_LENGTH} characters.`
    );
  }

  const chain = await switchChainAsync(commentRequest.chainId);

  const response = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...commentRequest,
      author: address,
      chainId: chain.id,
    } satisfies SignCommentPayloadRequestSchemaType),
  });

  if (!response.ok) {
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
