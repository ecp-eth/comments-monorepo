import z from "zod";
import {
  SendPostCommentRequestPayloadSchema,
  SendPostCommentResponseBodySchema,
} from "@ecp.eth/shared-signer/schemas/signer-api/post";
import { publicEnv } from "@/publicEnv";
import {
  createCommentData,
  createCommentTypedData,
} from "@ecp.eth/sdk/comments";
import { Account, type Chain, Transport, type WalletClient } from "viem";
import { throwKnownResponseCodeError } from "@ecp.eth/shared/errors";
import type { PendingPostCommentOperationSchemaType } from "@ecp.eth/shared/schemas";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { getSignerURL } from "@/lib/utils";
import { FetchFn } from "./types";
import { Hex } from "@ecp.eth/sdk/core/schemas";

class PostCommentGaslesslyError extends Error {}

type PostCommentGaslesslyResult = Omit<
  PendingPostCommentOperationSchemaType,
  "references" | "resolvedAuthor"
>;

export async function sendPostCommentGaslessly({
  requestPayload,
  walletClient,
  gasSponsorship,
  fetch,
}: {
  requestPayload: z.input<
    typeof SendPostCommentRequestPayloadSchema
  >["comment"];
  walletClient: WalletClient<Transport, Chain, Account>;
  gasSponsorship: "gasless-preapproved" | "gasless-not-preapproved";
  fetch: FetchFn;
}): Promise<PostCommentGaslesslyResult> {
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

  let authorSignature: Hex | undefined;
  if (gasSponsorship === "gasless-not-preapproved") {
    authorSignature = await walletClient.signTypedData(typedCommentData);
  }

  const response = await fetch(getSignerURL("/api/post-comment/send"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      {
        comment: {
          ...requestPayload,
        },
        authorSignature,
        deadline,
      } satisfies z.input<typeof SendPostCommentRequestPayloadSchema>,
      bigintReplacer,
    ),
  });

  if (!response.ok) {
    await throwKnownResponseCodeError(response);

    throw new PostCommentGaslesslyError(
      "Failed to post comment sponsored, please try again.",
    );
  }

  const postCommentResult = SendPostCommentResponseBodySchema.safeParse(
    await response.json(),
  );

  if (!postCommentResult.success) {
    throw new PostCommentGaslesslyError(
      "Server returned malformed posted comment data, please try again.",
    );
  }

  return {
    txHash: postCommentResult.data.txHash,
    response: postCommentResult.data,
    type: gasSponsorship,
    action: "post",
    state: { status: "pending" },
    chainId,
  };
}
