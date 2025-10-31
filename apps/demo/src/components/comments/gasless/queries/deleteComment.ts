import z from "zod";
import { Account, type Chain, Transport, type WalletClient } from "viem";
import { publicEnv } from "@/publicEnv";
import { throwKnownResponseCodeError } from "@ecp.eth/shared/errors";
import type { PendingDeleteCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import {
  SendDeleteCommentRequestPayloadSchema,
  SendDeleteCommentResponseBodySchema,
} from "@ecp.eth/shared/schemas/signer-api/delete";
import { createDeleteCommentTypedData } from "@ecp.eth/sdk/comments";
import { getSignerURL } from "@/lib/utils";

class DeleteCommentGaslesslyError extends Error {}

type DeleteCommentGaslesslyResult = Omit<
  PendingDeleteCommentOperationSchemaType,
  "references" | "resolvedAuthor"
>;

export async function sendDeleteCommentGaslessly({
  requestPayload,
  walletClient,
  gasSponsorship,
}: {
  requestPayload: Omit<
    z.input<typeof SendDeleteCommentRequestPayloadSchema>,
    "authorSignature" | "deadline"
  >;
  walletClient: WalletClient<Transport, Chain, Account>;
  gasSponsorship: "preapproved" | "not-preapproved";
}): Promise<DeleteCommentGaslesslyResult> {
  const { commentId, author } = requestPayload;
  const chainId = requestPayload.chainId;
  const typedDeleteData = createDeleteCommentTypedData({
    commentId,
    author,
    app: publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
    chainId,
  });
  const deadline = typedDeleteData.message.deadline;
  const authorSignature = await walletClient.signTypedData(typedDeleteData);

  const response = await fetch(getSignerURL("/api/delete-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        ...requestPayload,
        authorSignature,
        deadline,
      } satisfies z.input<typeof SendDeleteCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new DeleteCommentGaslesslyError(
      "Failed to delete comment sponsored, please try again.",
    );
  }

  const deleteCommentResult = SendDeleteCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!deleteCommentResult.success) {
    throw new DeleteCommentGaslesslyError(
      "Server returned malformed deleted comment data, please try again.",
    );
  }

  return {
    txHash: deleteCommentResult.data.txHash,
    type: authorSignature ? "gasless-not-preapproved" : "gasless-preapproved",
    action: "delete",
    state: { status: "pending" },
    chainId: requestPayload.chainId,
    commentId: requestPayload.commentId,
  };
}
