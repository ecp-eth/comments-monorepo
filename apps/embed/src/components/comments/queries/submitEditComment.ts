import {
  EditCommentPayloadInputSchema,
  EditCommentPayloadInputSchemaType,
  SignEditCommentPayloadRequestSchemaType,
  EditCommentPayloadRequestSchemaType,
  EditCommentResponseSchema,
} from "@/lib/schemas";
import { SignEditCommentResponseClientSchema } from "@ecp.eth/shared/schemas";
import { publicEnv } from "@/publicEnv";

import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type {
  Comment,
  PendingEditCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import {
  ContractReadFunctions,
  ContractWriteFunctions,
  createEditCommentData,
  createEditCommentTypedData,
  editComment,
  getComment,
  getNonce,
} from "@ecp.eth/sdk/comments";
import { SignTypedDataMutateAsync } from "wagmi/query";
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";
import {
  createEstimateChannelPostOrEditCommentFeeData,
  estimateChannelEditCommentFee,
  EstimateChannelEditCommentFeeReadContractType,
} from "@ecp.eth/sdk/channel-manager";

class SubmitEditCommentMutationError extends Error {}

type EditCommentRequestType = Omit<
  SignEditCommentPayloadRequestSchemaType,
  "author" | "metadata" | "commentId"
>;
type SubmitEditCommentParams = {
  address: Hex | undefined;
  comment: Comment;
  editRequest: EditCommentRequestType;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: ContractWriteFunctions["editComment"];
  readContractAsync: ContractReadFunctions["getNonce"] &
    ContractReadFunctions["getComment"] &
    EstimateChannelEditCommentFeeReadContractType;
  signTypedDataAsync: SignTypedDataMutateAsync;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
};
type PendingEditCommentOperationSchemaTypeWithoutReferences = Omit<
  PendingEditCommentOperationSchemaType,
  "references"
>;

export async function submitEditComment({
  address,
  comment,
  editRequest,
  switchChainAsync,
  writeContractAsync,
  readContractAsync,
  signTypedDataAsync,
  gasSponsorship,
}: SubmitEditCommentParams): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  if (!address) {
    throw new SubmitEditCommentMutationError("Wallet not connected.");
  }

  const parseResult = EditCommentPayloadInputSchema.safeParse({
    author: address,
    commentId: comment.id,
    content: editRequest.content,
    metadata: comment.metadata,
    chainId: editRequest.chainId,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const editCommentPayloadRequest = parseResult.data;

  const switchedChain = await switchChainAsync(editRequest.chainId);

  if (switchedChain.id !== editRequest.chainId) {
    throw new SubmitEditCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await editCommentWithoutGasless({
        editCommentPayloadRequest,
        readContractAsync,
        writeContractAsync,
        editRequest,
      });
    case "gasless-not-preapproved":
      return await editCommentWithGaslessAndAuthorSig({
        editCommentPayloadRequest,
        readContractAsync,
        signTypedDataAsync,
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
  editCommentPayloadRequest,
  readContractAsync,
  signTypedDataAsync,
}: {
  editCommentPayloadRequest: EditCommentPayloadInputSchemaType;
  readContractAsync: ContractReadFunctions["getNonce"];
  signTypedDataAsync: SignTypedDataMutateAsync;
}): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  const { commentId, content, author } = editCommentPayloadRequest;
  const nonce = await getNonce({
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    readContract: readContractAsync as ContractReadFunctions["getNonce"],
  });
  const editCommentData = createEditCommentData({
    commentId,
    content,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    nonce,
    metadata: editCommentPayloadRequest.metadata,
  });

  const chainId = editCommentPayloadRequest.chainId;
  const typedCommentData = createEditCommentTypedData({
    author,
    edit: editCommentData,
    chainId,
  });

  const deadline = editCommentData.deadline;
  const authorSignature = await signTypedDataAsync(typedCommentData);

  const response = await fetch("/api/edit-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        comment: editCommentPayloadRequest,
        authorSignature,
        deadline,
      } satisfies EditCommentPayloadRequestSchemaType,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitEditCommentMutationError(
      "Failed to edit comment sponsored, please try again.",
    );
  }

  const editCommentResult = EditCommentResponseSchema.safeParse(
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
    type: "gasless-not-approved",
    action: "edit",
    state: { status: "pending" },
    chainId: editCommentPayloadRequest.chainId,
  };
}

async function editCommentWithoutGasless({
  editCommentPayloadRequest,
  readContractAsync,
  writeContractAsync,
  editRequest,
}: {
  editCommentPayloadRequest: EditCommentPayloadInputSchemaType;
  readContractAsync: ContractReadFunctions["getComment"] &
    EstimateChannelEditCommentFeeReadContractType;
  writeContractAsync: ContractWriteFunctions["editComment"];
  editRequest: EditCommentRequestType;
}): Promise<PendingEditCommentOperationSchemaTypeWithoutReferences> {
  const response = await fetch("/api/sign-edit-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(editCommentPayloadRequest),
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
    const { comment: existingComment } = await getComment({
      readContract: readContractAsync as ContractReadFunctions["getComment"],
      commentId: editCommentPayloadRequest.commentId,
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
        msgSender: editCommentPayloadRequest.author,
        readContract: readContractAsync,
        channelId: existingComment.channelId,
      });
    }

    if ((fee?.contractAsset?.amount ?? 0n) > 0n) {
      // TODO: this will be supported in a separate PR or ticket
      throw new SubmitEditCommentMutationError(
        "We don't support editing to a channel requires fees to be paid in contract assets yet.",
      );
    }

    const { txHash } = await editComment({
      edit: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      writeContract: writeContractAsync,
      fee: fee?.baseToken.amount,
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
