import {
  DeleteCommentPayloadInputSchema,
  DeleteCommentPayloadInputSchemaType,
  DeleteCommentPayloadRequestSchemaType,
  DeleteCommentResponseSchema,
} from "@/lib/schemas";
import { publicEnv } from "@/publicEnv";
import { type Chain, ContractFunctionExecutionError, type Hex } from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { type DistributiveOmit } from "@ecp.eth/shared/types";
import {
  bigintReplacer,
  formatContractFunctionExecutionError,
} from "@ecp.eth/shared/helpers";
import {
  ContractWriteFunctions,
  createDeleteCommentTypedData,
  deleteComment,
} from "@ecp.eth/sdk/comments";
import { SignTypedDataMutateAsync } from "wagmi/query";
import { EmbedConfigSchemaOutputType } from "@ecp.eth/sdk/embed/schemas";

class SubmitDeleteCommentMutationError extends Error {}

type SubmitDeleteCommentParams = {
  author: Hex | undefined;
  deleteCommentRequest: DistributiveOmit<
    DeleteCommentPayloadInputSchemaType,
    "author"
  >;
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: ContractWriteFunctions["deleteComment"];
  signTypedDataAsync: SignTypedDataMutateAsync;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
};

export async function submitDeleteComment({
  author,
  deleteCommentRequest,
  switchChainAsync,
  writeContractAsync,
  signTypedDataAsync,
  gasSponsorship,
}: SubmitDeleteCommentParams): Promise<PendingDeleteCommentOperationSchemaType> {
  if (!author) {
    throw new SubmitDeleteCommentMutationError("Wallet not connected.");
  }

  const parseResult = DeleteCommentPayloadInputSchema.safeParse({
    ...deleteCommentRequest,
    author,
  });

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const deleteCommentPayloadRequest = parseResult.data;
  const switchedChain = await switchChainAsync(
    deleteCommentPayloadRequest.chainId,
  );

  if (switchedChain.id !== deleteCommentPayloadRequest.chainId) {
    throw new SubmitDeleteCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await deleteCommentWithoutGasless({
        deleteCommentPayloadRequest: deleteCommentPayloadRequest,
        writeContractAsync,
      });
    case "gasless-not-preapproved":
      return await deleteCommentWithGaslessAndAuthorSig({
        deleteCommentPayloadRequest: deleteCommentPayloadRequest,
        signTypedDataAsync,
      });
    case "gasless-preapproved":
      throw new SubmitDeleteCommentMutationError(
        "gasless-preapproved not supported",
      );
    default:
      gasSponsorship satisfies never;
      throw new SubmitDeleteCommentMutationError("Invalid gas sponsorship");
  }
}

async function deleteCommentWithGaslessAndAuthorSig({
  deleteCommentPayloadRequest,
  signTypedDataAsync,
}: {
  deleteCommentPayloadRequest: DeleteCommentPayloadInputSchemaType;
  signTypedDataAsync: SignTypedDataMutateAsync;
}): Promise<PendingDeleteCommentOperationSchemaType> {
  const { commentId, author } = deleteCommentPayloadRequest;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

  const chainId = deleteCommentPayloadRequest.chainId;
  const typedDeleteData = createDeleteCommentTypedData({
    commentId,
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    deadline,
    chainId,
  });

  const authorSignature = await signTypedDataAsync(typedDeleteData);

  const response = await fetch("/api/delete-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        comment: deleteCommentPayloadRequest,
        authorSignature,
        deadline,
      } satisfies DeleteCommentPayloadRequestSchemaType,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitDeleteCommentMutationError(
      "Failed to delete comment sponsored, please try again.",
    );
  }

  const deleteCommentResult = DeleteCommentResponseSchema.safeParse(
    await response.json(),
  );

  if (!deleteCommentResult.success) {
    throw new SubmitDeleteCommentMutationError(
      "Server returned malformed deleted comment data, please try again.",
    );
  }

  return {
    txHash: deleteCommentResult.data.txHash,
    type: authorSignature ? "gasless-not-approved" : "gasless-preapproved",
    action: "delete",
    state: { status: "pending" },
    chainId: deleteCommentPayloadRequest.chainId,
    commentId: deleteCommentPayloadRequest.commentId,
  };
}

async function deleteCommentWithoutGasless({
  deleteCommentPayloadRequest,
  writeContractAsync,
}: {
  deleteCommentPayloadRequest: DeleteCommentPayloadInputSchemaType;
  writeContractAsync: ContractWriteFunctions["deleteComment"];
}): Promise<PendingDeleteCommentOperationSchemaType> {
  try {
    const { txHash } = await deleteComment({
      commentId: deleteCommentPayloadRequest.commentId,
      writeContract: writeContractAsync,
    });

    return {
      txHash,
      type: "non-gasless",
      action: "delete",
      state: { status: "pending" },
      chainId: deleteCommentPayloadRequest.chainId,
      commentId: deleteCommentPayloadRequest.commentId,
    };
  } catch (e) {
    if (!(e instanceof Error)) {
      throw new SubmitDeleteCommentMutationError(
        "Failed to delete comment, please try again.",
      );
    }

    const message =
      e instanceof ContractFunctionExecutionError
        ? formatContractFunctionExecutionError(e)
        : e.message;

    throw new SubmitDeleteCommentMutationError(message);
  }
}
