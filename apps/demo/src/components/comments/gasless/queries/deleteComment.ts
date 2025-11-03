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
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { FetchFn } from "./types";

class DeleteCommentGaslesslyError extends Error {}

type DeleteCommentGaslesslyResult = Omit<
  PendingDeleteCommentOperationSchemaType,
  "references" | "resolvedAuthor"
>;

export async function sendDeleteCommentGaslessly({
  requestPayload,
  walletClient,
  gasSponsorship,
  fetch,
}: {
  requestPayload: z.input<
    typeof SendDeleteCommentRequestPayloadSchema.shape.delete
  >;
  walletClient: WalletClient<Transport, Chain, Account>;
  gasSponsorship: "gasless-preapproved" | "gasless-not-preapproved";
  fetch: FetchFn;
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

  let authorSignature: Hex | undefined;

  if (gasSponsorship === "gasless-not-preapproved") {
    authorSignature = await walletClient.signTypedData(typedDeleteData);
  }

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
    type: gasSponsorship,
    action: "delete",
    state: { status: "pending" },
    chainId: requestPayload.chainId,
    commentId: requestPayload.commentId,
  };
}
