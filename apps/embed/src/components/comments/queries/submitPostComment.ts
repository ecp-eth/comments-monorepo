import {
  PostCommentPayloadInputSchema,
  PostCommentPayloadInputSchemaType,
  PostCommentPayloadRequestSchemaType,
  PostCommentResponseSchema,
  SignCommentPayloadRequestSchemaType,
} from "@/lib/schemas";
import { SignCommentResponseClientSchema } from "@ecp.eth/shared/schemas";
import { publicEnv } from "@/publicEnv";
import { fetchAuthorData } from "@ecp.eth/sdk/indexer";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { type DistributiveOmit } from "@ecp.eth/shared/types";
import {
  bigintReplacer,
  formatContractFunctionExecutionError,
} from "@ecp.eth/shared/helpers";
import {
  ContractWriteFunctions,
  createCommentData,
  createCommentTypedData,
  postComment,
} from "@ecp.eth/sdk/comments";
import { SignTypedDataMutateAsync } from "wagmi/query";
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";

class SubmitPostCommentMutationError extends Error {}

type SubmitPostCommentParams = {
  author: Hex | undefined;
  postCommentRequest: DistributiveOmit<
    PostCommentPayloadInputSchemaType,
    "author"
  >;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: ContractWriteFunctions["postComment"];
  signTypedDataAsync: SignTypedDataMutateAsync;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
};

type SubmitPostCommentMutationResult = Omit<
  PendingPostCommentOperationSchemaType,
  "references"
>;

export async function submitPostComment({
  author,
  postCommentRequest,
  switchChainAsync,
  writeContractAsync,
  signTypedDataAsync,
  gasSponsorship,
}: SubmitPostCommentParams): Promise<SubmitPostCommentMutationResult> {
  if (!author) {
    throw new SubmitPostCommentMutationError("Wallet not connected.");
  }

  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address: author,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const parseResult = PostCommentPayloadInputSchema.safeParse({
    ...postCommentRequest,
    author,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const commentPayloadRequest = parseResult.data;
  const switchedChain = await switchChainAsync(commentPayloadRequest.chainId);

  if (switchedChain.id !== commentPayloadRequest.chainId) {
    throw new SubmitPostCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await postCommentWithoutGasless({
        postCommentPayloadRequest: commentPayloadRequest,
        writeContractAsync,
        resolvedAuthor,
      });

    case "gasless-not-preapproved":
      return await postCommentWithGaslessAndAuthorSig({
        postCommentPayloadRequest: commentPayloadRequest,
        signTypedDataAsync,
        resolvedAuthor,
      });

    case "gasless-preapproved":
      throw new SubmitPostCommentMutationError(
        "gasless-preapproved not supported",
      );
    default:
      gasSponsorship satisfies never;
      throw new SubmitPostCommentMutationError("Invalid gas sponsorship");
  }
}

async function postCommentWithGaslessAndAuthorSig({
  postCommentPayloadRequest,
  signTypedDataAsync,
  resolvedAuthor,
}: {
  postCommentPayloadRequest: PostCommentPayloadInputSchemaType;
  signTypedDataAsync: SignTypedDataMutateAsync;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<SubmitPostCommentMutationResult> {
  const { content, author, commentType } = postCommentPayloadRequest;
  const commentData = createCommentData({
    content,
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    commentType: commentType,
    ...("parentId" in postCommentPayloadRequest
      ? {
          parentId: postCommentPayloadRequest.parentId,
        }
      : {
          targetUri: postCommentPayloadRequest.targetUri,
        }),
  });

  const chainId = postCommentPayloadRequest.chainId;
  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const deadline = commentData.deadline;
  const authorSignature = await signTypedDataAsync(typedCommentData);

  const response = await fetch("/api/post-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        comment: postCommentPayloadRequest,
        authorSignature,
        deadline,
      } satisfies PostCommentPayloadRequestSchemaType,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitPostCommentMutationError(
      "Failed to post comment sponsored, please try again.",
    );
  }

  const postCommentResult = PostCommentResponseSchema.safeParse(
    await response.json(),
  );

  if (!postCommentResult.success) {
    throw new SubmitPostCommentMutationError(
      "Server returned malformed posted comment data, please try again.",
    );
  }

  return {
    txHash: postCommentResult.data.txHash,
    resolvedAuthor,
    response: postCommentResult.data,
    type: authorSignature ? "gasless-not-approved" : "gasless-preapproved",
    action: "post",
    state: { status: "pending" },
    chainId: postCommentPayloadRequest.chainId,
  };
}

async function postCommentWithoutGasless({
  postCommentPayloadRequest,
  writeContractAsync,
  resolvedAuthor,
}: {
  postCommentPayloadRequest: PostCommentPayloadInputSchemaType;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
  writeContractAsync: ContractWriteFunctions["postComment"];
}): Promise<SubmitPostCommentMutationResult> {
  const response = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      postCommentPayloadRequest satisfies SignCommentPayloadRequestSchemaType,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitPostCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignCommentResponseClientSchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitPostCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  try {
    const { txHash } = await postComment({
      comment: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      writeContract: writeContractAsync,
    });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId: postCommentPayloadRequest.chainId,
    };
  } catch (e) {
    if (!(e instanceof Error)) {
      throw new SubmitPostCommentMutationError(
        "Failed to post comment, please try again.",
      );
    }

    const message =
      e instanceof ContractFunctionExecutionError
        ? formatContractFunctionExecutionError(e)
        : e.message;

    throw new SubmitPostCommentMutationError(message);
  }
}
