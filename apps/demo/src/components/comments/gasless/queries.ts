import {
  type PrepareGaslessCommentDeletionRequestBodySchemaType,
  PrepareGaslessDeleteCommentOperationResponseSchema,
  type PrepareGaslessDeleteCommentOperationResponseSchemaType,
  PrepareSignedGaslessCommentRequestBodySchemaType,
  PreparedGaslessPostCommentOperationApprovedSchemaType,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  type PreparedSignedGaslessDeleteCommentApprovedSchemaType,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  type PreparedSignedGaslessDeleteCommentNotApprovedSchemaType,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
} from "@/lib/schemas";
import type { Hex } from "viem";
import { fetchAuthorData } from "@ecp.eth/sdk";
import { publicEnv } from "@/publicEnv";
import type { IndexerAPIAuthorDataSchemaType } from "@ecp.eth/sdk/schemas";

export type PreparedGaslessPostCommentOperationApprovedResult =
  PreparedGaslessPostCommentOperationApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

export type PreparedGaslessPostCommentOperationNotApprovedResult =
  PreparedSignedGaslessPostCommentNotApprovedSchemaType & {
    resolvedAuthor?: IndexerAPIAuthorDataSchemaType;
  };

type PrepareSignedGaslessCommentRequestBodySchemaTypeReply = Omit<
  Exclude<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    {
      parentId: Hex;
    }
  >,
  "submitIfApproved"
>;

type PrepareSignedGaslessCommentRequestBodySchemaTypeComment = Omit<
  Exclude<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    {
      targetUri: string;
    }
  >,
  "submitIfApproved"
>;

export async function prepareSignedGaslessComment(
  submitIfApproved: true,
  body:
    | PrepareSignedGaslessCommentRequestBodySchemaTypeReply
    | PrepareSignedGaslessCommentRequestBodySchemaTypeComment
): Promise<PreparedGaslessPostCommentOperationApprovedResult>;
export async function prepareSignedGaslessComment(
  submitIfApproved: false,
  body:
    | PrepareSignedGaslessCommentRequestBodySchemaTypeReply
    | PrepareSignedGaslessCommentRequestBodySchemaTypeComment
): Promise<PreparedGaslessPostCommentOperationNotApprovedResult>;

export async function prepareSignedGaslessComment(
  submitIfApproved: boolean,
  body:
    | PrepareSignedGaslessCommentRequestBodySchemaTypeReply
    | PrepareSignedGaslessCommentRequestBodySchemaTypeComment
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
}): Promise<PreparedSignedGaslessDeleteCommentApprovedSchemaType> {
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
}): Promise<PreparedSignedGaslessDeleteCommentNotApprovedSchemaType> {
  const result = await gaslessDeleteComment({
    author: address,
    commentId,
    submitIfApproved: false,
  });

  return PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema.parse(
    result
  );
}
