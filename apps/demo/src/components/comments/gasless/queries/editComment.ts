import { publicEnv } from "@/publicEnv";
import {
  Account,
  type Chain,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { throwKnownResponseCodeError } from "@ecp.eth/shared/errors";
import type { PendingEditCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import {
  createEditCommentData,
  createEditCommentTypedData,
  getNonce,
} from "@ecp.eth/sdk/comments";
import {
  SendEditCommentRequestPayloadSchema,
  SendEditCommentResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/edit";
import z from "zod";
import { DistributiveOmit } from "@ecp.eth/shared/types";
import { getSignerURL } from "@/lib/utils";

class EditCommentGaslesslyError extends Error {}

type EditCommentGaslesslyResult = Omit<
  PendingEditCommentOperationSchemaType,
  "references"
>;

export async function sendEditCommentGaslesslyNotPreapproved({
  requestPayload,
  publicClient,
  walletClient,
}: {
  requestPayload: DistributiveOmit<
    z.input<typeof SendEditCommentRequestPayloadSchema>,
    "authorSignature" | "deadline"
  >;
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
}): Promise<EditCommentGaslesslyResult> {
  const { commentId, content, author } = requestPayload;
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
    metadata: requestPayload.metadata,
  });

  const chainId = requestPayload.chainId;
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
        ...requestPayload,
        authorSignature,
        deadline,
      } satisfies z.input<typeof SendEditCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new EditCommentGaslesslyError(
      "Failed to edit comment sponsored, please try again.",
    );
  }

  const editCommentResult = SendEditCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!editCommentResult.success) {
    throw new EditCommentGaslesslyError(
      "Server returned malformed edited comment data, please try again.",
    );
  }

  return {
    txHash: editCommentResult.data.txHash,
    response: editCommentResult.data,
    type: "gasless-not-preapproved",
    action: "edit",
    state: { status: "pending" },
    chainId: requestPayload.chainId,
  };
}
