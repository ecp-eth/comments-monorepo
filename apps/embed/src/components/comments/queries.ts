import {
  CommentPayloadRequestSchemaType,
  PostCommentPayloadRequestSchemaType,
  PostCommentResponseSchema,
  SignCommentPayloadRequestSchema,
  SignCommentPayloadRequestSchemaType,
  SignEditCommentPayloadRequestSchema,
  SignEditCommentPayloadRequestSchemaType,
} from "@/lib/schemas";
import {
  SignCommentResponseClientSchema,
  SignEditCommentResponseClientSchema,
} from "@ecp.eth/shared/schemas";
import { publicEnv } from "@/publicEnv";
import {
  fetchAuthorData,
  type IndexerAPICommentReferencesSchemaType,
} from "@ecp.eth/sdk/indexer";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
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
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import {
  ContractReadFunctions,
  ContractWriteFunctions,
  createCommentData,
  createCommentTypedData,
  isApproved,
  postComment,
} from "@ecp.eth/sdk/comments";
import { SignTypedDataMutateAsync } from "wagmi/query";

export function createCommentItemsQueryKey(
  viewer: Hex | undefined,
  chainId: number,
  targetUriOrCommentIdOrAuthor: string,
) {
  return ["CommentItems", viewer, chainId, targetUriOrCommentIdOrAuthor];
}

export function createReplyItemsQueryKey(
  viewer: Hex | undefined,
  chainId: number,
  commentId: Hex,
) {
  return ["ReplyItems", viewer, chainId, commentId];
}

export class SubmitCommentMutationError extends Error {}
export class SubmitEditCommentMutationError extends Error {}

type SubmitCommentParams = {
  author: Hex | undefined;
  commentRequest: DistributiveOmit<CommentPayloadRequestSchemaType, "author">;
  references: IndexerAPICommentReferencesSchemaType;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  readContractAsync: ContractReadFunctions["getIsApproved"];
  writeContractAsync: ContractWriteFunctions["postComment"];
  signTypedDataAsync: SignTypedDataMutateAsync;
};

type PendingPostCommentOperationSchemaTypeWithoutReferences = Omit<
  PendingPostCommentOperationSchemaType,
  "references"
>;

export async function submitCommentMutationFunction({
  author,
  commentRequest,
  references,
  switchChainAsync,
  readContractAsync,
  writeContractAsync,
  signTypedDataAsync,
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

  const commentPayloadRequest = parseResult.data;

  const switchedChain = await switchChainAsync(commentPayloadRequest.chainId);

  if (switchedChain.id !== commentPayloadRequest.chainId) {
    throw new SubmitCommentMutationError("Failed to switch chain.");
  }

  const pendingOperation = publicEnv.NEXT_PUBLIC_GASLESS_ENABLED
    ? await postCommentGaslessly({
        readContractAsync,
        commentPayloadRequest,
        signTypedDataAsync,
      })
    : {
        ...(await postCommentNonGaslessly({
          commentPayloadRequest,
          writeContractAsync,
          resolvedAuthor,
        })),
        references,
      };

  return {
    ...pendingOperation,
    references,
  };
}

async function postCommentGaslessly({
  commentPayloadRequest,
  readContractAsync,
  signTypedDataAsync,
  resolvedAuthor,
}: {
  commentPayloadRequest: CommentPayloadRequestSchemaType;
  readContractAsync: ContractReadFunctions["getIsApproved"];
  signTypedDataAsync: SignTypedDataMutateAsync;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<PendingPostCommentOperationSchemaTypeWithoutReferences> {
  const appApproved = await isApproved({
    author: commentPayloadRequest.author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    readContract: readContractAsync,
  });

  let authorSignature: Hex | undefined;

  if (!appApproved) {
    const { content, author, commentType } = commentPayloadRequest;
    const commentData = createCommentData({
      content,
      author,
      app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
      metadata: [],
      ...("parentId" in commentPayloadRequest
        ? {
            parentId: commentPayloadRequest.parentId,
          }
        : {
            targetUri: commentPayloadRequest.targetUri,
          }),
      commentType: commentType,
    });

    const chainId = commentPayloadRequest.chainId;
    const typedCommentData = createCommentTypedData({
      commentData,
      chainId,
    });

    authorSignature = await signTypedDataAsync(typedCommentData);
  }

  const response = await fetch("/api/post-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      comment: commentPayloadRequest,
      authorSignature,
    } satisfies PostCommentPayloadRequestSchemaType),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const postCommentResult = PostCommentResponseSchema.safeParse(
    await response.json(),
  );

  if (!postCommentResult.success) {
    throw new SubmitCommentMutationError(
      "Server returned malformed posted comment data, please try again.",
    );
  }

  return {
    txHash: postCommentResult.data.txHash,
    resolvedAuthor,
    response: postCommentResult.data,
    type: authorSignature ? "gasless-preapproved" : "gasless-not-approved",
    action: "post",
    state: { status: "pending" },
    chainId: commentPayloadRequest.chainId,
  };
}

async function postCommentNonGaslessly({
  commentPayloadRequest,
  writeContractAsync,
  resolvedAuthor,
}: {
  commentPayloadRequest: CommentPayloadRequestSchemaType;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
  writeContractAsync: ContractWriteFunctions["postComment"];
}): Promise<PendingPostCommentOperationSchemaTypeWithoutReferences> {
  const response = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      commentPayloadRequest satisfies SignCommentPayloadRequestSchemaType,
    ),
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
    const { txHash } = await postComment({
      comment: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      writeContract: writeContractAsync,
    });
    // const txHash = await writeContractAsync({
    //   signCommentResponse: signedCommentResult.data,
    //   chainId: commentPayloadRequest.chainId,
    // });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId: commentPayloadRequest.chainId,
    };
  } catch (e) {
    if (!(e instanceof Error)) {
      throw new SubmitCommentMutationError(
        "Failed to post comment, please try again.",
      );
    }

    const message =
      e instanceof ContractFunctionExecutionError
        ? formatContractFunctionExecutionError(e)
        : e.message;

    throw new SubmitCommentMutationError(message);
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
