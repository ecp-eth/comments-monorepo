import z from "zod";
import { publicEnv } from "@/publicEnv";
import {
  Account,
  type Chain,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { Hex } from "@ecp.eth/sdk/core/schemas";
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
import { getSignerURL } from "@/lib/utils";
import { FetchFn } from "./types";

class EditCommentGaslesslyError extends Error {}

type EditCommentGaslesslyResult = Omit<
  PendingEditCommentOperationSchemaType,
  "references"
>;

export async function sendEditCommentGaslessly({
  requestPayload,
  publicClient,
  walletClient,
  gasSponsorship,
  fetch,
}: {
  requestPayload: z.input<typeof SendEditCommentRequestPayloadSchema>["edit"];
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
  gasSponsorship: "gasless-preapproved" | "gasless-not-preapproved";
  fetch: FetchFn;
}): Promise<EditCommentGaslesslyResult> {
  const { commentId, content, author, chainId, metadata } = requestPayload;
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
  let authorSignature: Hex | undefined;

  if (gasSponsorship === "gasless-not-preapproved") {
    authorSignature = await walletClient.signTypedData(typedCommentData);
  }

  const response = await fetch(getSignerURL("/api/edit-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        edit: {
          ...requestPayload,
        },
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
    chainId,
  };
}
