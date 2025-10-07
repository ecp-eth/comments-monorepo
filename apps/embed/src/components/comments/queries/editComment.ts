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
  getNonce,
  isApproved,
} from "@ecp.eth/sdk/comments";
import { SignTypedDataMutateAsync } from "wagmi/query";

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
  readContractAsync:
    | ContractReadFunctions["getIsApproved"]
    | ContractReadFunctions["getNonce"];
  signTypedDataAsync: SignTypedDataMutateAsync;
};

export async function submitEditCommentMutationFunction({
  address,
  comment,
  editRequest,
  switchChainAsync,
  writeContractAsync,
  readContractAsync,
  signTypedDataAsync,
}: SubmitEditCommentParams): Promise<PendingEditCommentOperationSchemaType> {
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

  const pendingOperation = publicEnv.NEXT_PUBLIC_GASLESS_ENABLED
    ? await editCommentGaslessly({
        readContractAsync,
        editCommentPayloadRequest,
        signTypedDataAsync,
      })
    : await editCommentNonGaslessly({
        editCommentPayloadRequest,
        writeContractAsync,
        editRequest,
      });

  return {
    ...pendingOperation,
  };
}

async function editCommentGaslessly({
  editCommentPayloadRequest,
  readContractAsync,
  signTypedDataAsync,
}: {
  editCommentPayloadRequest: EditCommentPayloadInputSchemaType;
  readContractAsync:
    | ContractReadFunctions["getIsApproved"]
    | ContractReadFunctions["getNonce"];
  signTypedDataAsync: SignTypedDataMutateAsync;
}): Promise<PendingEditCommentOperationSchemaType> {
  const appApproved = await isApproved({
    author: editCommentPayloadRequest.author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    readContract: readContractAsync as ContractReadFunctions["getIsApproved"],
  });

  let authorSignature: Hex | undefined;
  let deadline: bigint | undefined;

  if (!appApproved) {
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

    deadline = editCommentData.deadline;
    authorSignature = await signTypedDataAsync(typedCommentData);
  }

  console.log("new deadline", deadline);

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
    type: authorSignature ? "gasless-not-approved" : "gasless-preapproved",
    action: "edit",
    state: { status: "pending" },
    chainId: editCommentPayloadRequest.chainId,
  };
}

async function editCommentNonGaslessly({
  editCommentPayloadRequest,
  writeContractAsync,
  editRequest,
}: {
  editCommentPayloadRequest: EditCommentPayloadInputSchemaType;
  writeContractAsync: ContractWriteFunctions["editComment"];
  editRequest: EditCommentRequestType;
}): Promise<PendingEditCommentOperationSchemaType> {
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
    const { txHash } = await editComment({
      edit: signedCommentResult.data.data,
      appSignature: signedCommentResult.data.signature,
      writeContract: writeContractAsync,
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
