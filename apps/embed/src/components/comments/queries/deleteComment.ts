import { publicEnv } from "@/publicEnv";
import { type Chain, ContractFunctionExecutionError } from "viem";
import {
  InvalidCommentError,
  throwKnownResponseCodeError,
} from "@ecp.eth/shared/errors";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
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
import { getSignerURL } from "@/lib/utils";
import z from "zod";
import {
  SendDeleteCommentRequestPayloadSchema,
  SendDeleteCommentResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/delete";

class SubmitDeleteCommentMutationError extends Error {}

type SubmitDeleteCommentParams = {
  requestPayload: z.input<
    typeof SendDeleteCommentRequestPayloadSchema
  >["delete"];
  switchChainAsync: (chainId: number) => Promise<Chain>;
  writeContractAsync: ContractWriteFunctions["deleteComment"];
  signTypedDataAsync: SignTypedDataMutateAsync;
  gasSponsorship: EmbedConfigSchemaOutputType["gasSponsorship"];
};

export async function submitDeleteComment({
  requestPayload,
  switchChainAsync,
  writeContractAsync,
  signTypedDataAsync,
  gasSponsorship,
}: SubmitDeleteCommentParams): Promise<PendingDeleteCommentOperationSchemaType> {
  const parseResult =
    SendDeleteCommentRequestPayloadSchema.shape.delete.safeParse(
      requestPayload,
    );

  if (!parseResult.success) {
    throw new InvalidCommentError(parseResult.error.flatten().fieldErrors);
  }

  const { chainId } = parseResult.data;

  const switchedChain = await switchChainAsync(chainId);

  if (switchedChain.id !== chainId) {
    throw new SubmitDeleteCommentMutationError("Failed to switch chain.");
  }

  switch (gasSponsorship) {
    case "not-gasless":
      return await deleteCommentWithoutGasless({
        requestPayload,
        writeContractAsync,
      });
    case "gasless-not-preapproved":
      return await deleteCommentWithGaslessAndAuthorSig({
        requestPayload,
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
  requestPayload,
  signTypedDataAsync,
}: {
  requestPayload: z.input<
    typeof SendDeleteCommentRequestPayloadSchema
  >["delete"];
  signTypedDataAsync: SignTypedDataMutateAsync;
}): Promise<PendingDeleteCommentOperationSchemaType> {
  const { commentId, author, chainId } = requestPayload;
  const typedDeleteData = createDeleteCommentTypedData({
    commentId,
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chainId,
  });
  const deadline = typedDeleteData.message.deadline;
  const authorSignature = await signTypedDataAsync(typedDeleteData);

  const response = await fetch(getSignerURL("/api/delete-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        delete: {
          ...requestPayload,
        },
        deadline,
        authorSignature,
      } satisfies z.input<typeof SendDeleteCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new SubmitDeleteCommentMutationError(
      "Failed to delete comment sponsored, please try again.",
    );
  }

  const deleteCommentResult = SendDeleteCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!deleteCommentResult.success) {
    throw new SubmitDeleteCommentMutationError(
      "Server returned malformed deleted comment data, please try again.",
    );
  }

  return {
    txHash: deleteCommentResult.data.txHash,
    type: authorSignature ? "gasless-not-preapproved" : "gasless-preapproved",
    action: "delete",
    state: { status: "pending" },
    chainId,
    commentId,
  };
}

async function deleteCommentWithoutGasless({
  requestPayload,
  writeContractAsync,
}: {
  requestPayload: z.input<
    typeof SendDeleteCommentRequestPayloadSchema
  >["delete"];
  writeContractAsync: ContractWriteFunctions["deleteComment"];
}): Promise<PendingDeleteCommentOperationSchemaType> {
  try {
    const { commentId, chainId } = requestPayload;
    const { txHash } = await deleteComment({
      commentId,
      writeContract: writeContractAsync,
    });

    return {
      txHash,
      type: "non-gasless",
      action: "delete",
      state: { status: "pending" },
      chainId,
      commentId,
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
