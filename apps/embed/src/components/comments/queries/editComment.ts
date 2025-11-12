import z from "zod";
import { publicEnv } from "@/publicEnv";
import {
  Account,
  type Chain,
  ContractFunctionExecutionError,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type { PendingEditCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import {
  createEditCommentData,
  createEditCommentTypedData,
  editComment,
  getComment,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelEditCommentFee,
} from "@ecp.eth/sdk/channel-manager";
import { prepareContractAssetForTransfer } from "./prepareContractAssetForTransfer";
import { getSignerURL } from "@/lib/utils";
import {
  SendEditCommentRequestPayloadSchema,
  SendEditCommentResponseBodySchema,
  SignEditCommentRequestPayloadSchema,
  SignEditCommentResponseBodySchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/edit";

class SubmitEditCommentMutationError extends Error {}

type SubmitEditCommentParams = {
  requestPayload: z.input<typeof SendEditCommentRequestPayloadSchema>["edit"];
  switchChainAsync: (chainId: number) => Promise<Chain>;
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
};
type PendingEditCommentOperationSchemaTypeWithoutReferences = Omit<
  PendingEditCommentOperationSchemaType,
  "references"
>;

export async function submitEditComment({
  requestPayload,
  switchChainAsync,
  publicClient,
  walletClient,
  gasSponsorship,
}: SubmitEditCommentParams): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  const parseResult =
    SendEditCommentRequestPayloadSchema.shape.edit.safeParse(requestPayload);

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const { chainId } = parseResult.data;
  const switchedChain = await switchChainAsync(chainId);

  if (switchedChain.id !== chainId) {
    throw new SubmitEditCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await editCommentWithoutGasless({
        requestPayload,
        publicClient,
        walletClient,
      });
    case "gasless-not-preapproved":
      return await editCommentWithGaslessAndAuthorSig({
        requestPayload,
        publicClient,
        walletClient,
      });
    case "gasless-preapproved":
      throw new SubmitEditCommentMutationError(
        "gasless-preapproved not supported",
      );
    default:
      gasSponsorship satisfies never;
      throw new SubmitEditCommentMutationError("Invalid gas sponsorship");
  }
}

async function editCommentWithGaslessAndAuthorSig({
  requestPayload,
  publicClient,
  walletClient,
}: {
  requestPayload: z.input<typeof SendEditCommentRequestPayloadSchema>["edit"];
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
}): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  const { commentId, content, author, metadata, chainId } = requestPayload;
  const nonce = await getNonce({
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    readContract: publicClient.readContract,
  });
  const editCommentData = createEditCommentData({
    commentId,
    content,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    nonce,
    metadata,
  });

  const typedCommentData = createEditCommentTypedData({
    author,
    edit: editCommentData,
    chainId,
  });

  const deadline = editCommentData.deadline;
  const authorSignature = await walletClient.signTypedData(typedCommentData);

  const response = await fetch(getSignerURL("/api/edit-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        edit: requestPayload,
        authorSignature,
        deadline,
      } satisfies z.input<typeof SendEditCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitEditCommentMutationError(
      "Failed to edit comment sponsored, please try again.",
    );
  }

  const editCommentResult = SendEditCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!editCommentResult.success) {
    throw new SubmitEditCommentMutationError(
      "Server returned malformed edited comment data, please try again.",
    );
  }

  return {
    txHash: editCommentResult.data.txHash,
    response: editCommentResult.data,
    type: "gasless-not-preapproved",
    action: "edit",
    state: { status: "pending" },
    chainId,
  };
}

async function editCommentWithoutGasless({
  requestPayload,
  publicClient,
  walletClient,
}: {
  requestPayload: z.input<typeof SendEditCommentRequestPayloadSchema>["edit"];
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
}): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  const { author, commentId, chainId } = requestPayload;
  const response = await fetch(getSignerURL("/api/edit-comment/sign"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      requestPayload satisfies z.input<
        typeof SignEditCommentRequestPayloadSchema
      >,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitEditCommentMutationError(
      "Failed to obtain signed comment data, please try again.",
    );
  }

  const signedCommentResult = SignEditCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!signedCommentResult.success) {
    throw new SubmitEditCommentMutationError(
      "Server returned malformed signed comment data, please try again.",
    );
  }

  try {
    const { comment: existingComment } = await getComment({
      readContract: publicClient.readContract,
      commentId,
    });

    let fee:
      | Awaited<ReturnType<typeof estimateChannelEditCommentFee>>
      | undefined;

    if (existingComment.channelId) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...commentDataExcludedDates } =
        existingComment;
      // Estimate the fee for posting a comment to the channel
      const estimationCommentData =
        createEstimateChannelPostOrEditCommentFeeData({
          ...commentDataExcludedDates,
        });
      fee = await estimateChannelEditCommentFee({
        commentData: estimationCommentData,
        metadata: [],
        msgSender: author,
        readContract: publicClient.readContract,
        channelId: existingComment.channelId,
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

    const { txHash } = await editComment({
      edit: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      writeContract: walletClient.writeContract,
      fee: fee?.baseToken.amount,
    });

    return {
      txHash,
      response: signedCommentResult.data,
      type: "non-gasless",
      action: "edit",
      state: { status: "pending" },
      chainId,
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
