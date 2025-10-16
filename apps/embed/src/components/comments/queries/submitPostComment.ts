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
import {
  estimateChannelPostCommentFee,
  createEstimateChannelPostOrEditCommentFeeData,
} from "@ecp.eth/sdk/channel-manager";
import {
  createCommentData,
  createCommentTypedData,
  postComment,
} from "@ecp.eth/sdk/comments";
import {
  Account,
  type Chain,
  ContractFunctionExecutionError,
  type Hex,
  PublicClient,
  Transport,
  type WalletClient,
} from "viem";
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
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import { prepareContractAssetForTransfer } from "./prepareContractAssetForTransfer";

class SubmitPostCommentMutationError extends Error {}

type SubmitPostCommentParams = {
  author: Hex | undefined;
  postCommentRequest: DistributiveOmit<
    PostCommentPayloadInputSchemaType,
    "author"
  >;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
};

type SubmitPostCommentMutationResult = Omit<
  PendingPostCommentOperationSchemaType,
  "references"
>;

export async function submitPostComment({
  author,
  postCommentRequest,
  switchChainAsync,
  publicClient,
  walletClient,
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
        publicClient,
        walletClient,
        resolvedAuthor,
      });

    case "gasless-not-preapproved":
      return await postCommentWithGaslessAndAuthorSig({
        postCommentPayloadRequest: commentPayloadRequest,
        resolvedAuthor,
        walletClient,
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
  walletClient,
  resolvedAuthor,
}: {
  postCommentPayloadRequest: PostCommentPayloadInputSchemaType;
  walletClient: WalletClient<Transport, Chain, Account>;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<SubmitPostCommentMutationResult> {
  const { chainId } = postCommentPayloadRequest;
  const commentData = createCommentData({
    ...postCommentPayloadRequest,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const deadline = commentData.deadline;
  const authorSignature = await walletClient.signTypedData(typedCommentData);

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
    type: "gasless-not-approved",
    action: "post",
    state: { status: "pending" },
    chainId,
  };
}

async function postCommentWithoutGasless({
  postCommentPayloadRequest,
  publicClient,
  walletClient,
  resolvedAuthor,
}: {
  postCommentPayloadRequest: PostCommentPayloadInputSchemaType;
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<SubmitPostCommentMutationResult> {
  const { chainId, channelId, author } = postCommentPayloadRequest;
  const response = await fetch("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      postCommentPayloadRequest satisfies SignCommentPayloadRequestSchemaType,
      bigintReplacer,
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
    let fee:
      | Awaited<ReturnType<typeof estimateChannelPostCommentFee>>
      | undefined;

    if (channelId) {
      // Estimate the fee for posting a comment to the channel
      const estimationCommentData =
        createEstimateChannelPostOrEditCommentFeeData({
          ...postCommentPayloadRequest,
          app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
        });
      fee = await estimateChannelPostCommentFee({
        commentData: estimationCommentData,
        metadata: [],
        msgSender: author,
        readContract: publicClient.readContract,
        channelId,
      });
    }

    if (fee?.contractAsset && fee.contractAsset.amount > 0n) {
      await prepareContractAssetForTransfer({
        contractAsset: fee.contractAsset,
        hook: fee.hook,
        author,
        publicClient,
        walletClient,
      });
    }

    const { txHash } = await postComment({
      comment: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      fee: fee?.baseToken.amount,
      writeContract: walletClient.writeContract,
    });

    return {
      txHash,
      resolvedAuthor,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "post",
      state: { status: "pending" },
      chainId,
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
