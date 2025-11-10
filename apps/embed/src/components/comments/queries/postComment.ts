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
  PublicClient,
  Transport,
  type WalletClient,
} from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import {
  bigintReplacer,
  formatContractFunctionExecutionError,
} from "@ecp.eth/shared/helpers";
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import { prepareContractAssetForTransfer } from "./prepareContractAssetForTransfer";
import { getSignerURL } from "@/lib/utils";
import {
  SendPostCommentRequestPayloadSchema,
  SendPostCommentResponseBodySchema,
  SignPostCommentRequestPayloadSchema,
} from "@ecp.eth/shared/schemas/signer-api/post";
import z from "zod";

class SubmitPostCommentMutationError extends Error {}

type SubmitPostCommentParams = {
  requestPayload: z.input<
    typeof SendPostCommentRequestPayloadSchema
  >["comment"];
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
  requestPayload,
  switchChainAsync,
  publicClient,
  walletClient,
  gasSponsorship,
}: SubmitPostCommentParams): Promise<SubmitPostCommentMutationResult> {
  const parseResult =
    SendPostCommentRequestPayloadSchema.shape.comment.safeParse(requestPayload);

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const { author } = parseResult.data;

  // ignore errors here, we don't want to block the comment submission
  const resolvedAuthor = await fetchAuthorData({
    address: author,
    apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
  }).catch((e) => {
    console.error(e);
    return undefined;
  });

  const commentPayloadRequest = parseResult.data;
  const switchedChain = await switchChainAsync(commentPayloadRequest.chainId);

  if (switchedChain.id !== commentPayloadRequest.chainId) {
    throw new SubmitPostCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await postCommentWithoutGasless({
        requestPayload,
        publicClient,
        walletClient,
        resolvedAuthor,
      });

    case "gasless-not-preapproved":
      return await postCommentWithGaslessAndAuthorSig({
        requestPayload,
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
  requestPayload,
  walletClient,
  resolvedAuthor,
}: {
  requestPayload: z.input<
    typeof SendPostCommentRequestPayloadSchema
  >["comment"];
  walletClient: WalletClient<Transport, Chain, Account>;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<SubmitPostCommentMutationResult> {
  const { chainId } = requestPayload;
  const commentData = createCommentData({
    ...requestPayload,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
  });

  const typedCommentData = createCommentTypedData({
    commentData,
    chainId,
  });

  const deadline = commentData.deadline;
  const authorSignature = await walletClient.signTypedData(typedCommentData);

  const response = await fetch(getSignerURL("/api/post-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        comment: requestPayload,
        authorSignature,
        deadline,
      } satisfies z.input<typeof SendPostCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitPostCommentMutationError(
      "Failed to post comment sponsored, please try again.",
    );
  }

  const postCommentResult = SendPostCommentResponseBodySchema.safeParse(
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
    type: "gasless-not-preapproved",
    action: "post",
    state: { status: "pending" },
    chainId,
  };
}

async function postCommentWithoutGasless({
  requestPayload,
  publicClient,
  walletClient,
  resolvedAuthor,
}: {
  requestPayload: z.input<
    typeof SendPostCommentRequestPayloadSchema
  >["comment"];
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
  resolvedAuthor?: Awaited<ReturnType<typeof fetchAuthorData>>;
}): Promise<SubmitPostCommentMutationResult> {
  const { chainId, channelId, author } = requestPayload;
  const response = await fetch(getSignerURL("/api/post-comment/sign"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      requestPayload satisfies z.input<
        typeof SignPostCommentRequestPayloadSchema
      >,
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
          ...requestPayload,
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
