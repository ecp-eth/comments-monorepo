import { waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { Hex, TransactionReceipt } from "viem";
import { bigintReplacer } from "@ecp.eth/shared/helpers";
import { SignCommentResponseClientSchema } from "@ecp.eth/shared/schemas";
import { QueryClient } from "@tanstack/react-query";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer";
import {
  postComment as postCommentFromSDK,
  deleteComment as deleteCommentFromSDK,
} from "@ecp.eth/sdk/comments";
import { fetchAPI } from "./fetch";
import { SignCommentPayloadRequestSchemaType } from "./generated/schemas";
import { chain, config } from "../wagmi.config";
import { FetchCommentInfinityQuerySchema } from "../hooks/useOptimisticCommentingManager/schemas";
import type { CreateCommentData } from "@ecp.eth/sdk/comments/schemas";
import { LOCAL_COMMENT_ADDRESS_MANAGER } from "./generated/contract-addresses";

const chainId = chain.id;

// for local testing we will have to manually set the comment manager address
const commentManagerAddress =
  config.chains[0].name === "Anvil" ? LOCAL_COMMENT_ADDRESS_MANAGER : undefined;

type PostCommentResponse = {
  receipt: TransactionReceipt;
  txHash: Hex;
  commentData: CreateCommentData;
  appSignature: Hex;
  commentId: Hex;
};

export const postComment = async (
  comment: SignCommentPayloadRequestSchemaType,
): Promise<PostCommentResponse> => {
  const signed = await fetchAPI(
    "/api/sign-comment",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(comment, bigintReplacer),
    },
    SignCommentResponseClientSchema,
  );

  const {
    data: commentData,
    signature: appSignature,
    hash: commentId,
  } = signed;

  const { txHash } = await postCommentFromSDK({
    commentsAddress: commentManagerAddress,
    comment: commentData,
    appSignature,
    writeContract: (opts) => writeContract(config, opts),
  });

  const receipt = await waitForTransactionReceipt(config, {
    hash: txHash,
    chainId,
  });

  return {
    receipt,
    txHash,
    commentData,
    appSignature,
    commentId,
  };
};

export const deleteComment = async ({ commentId }: { commentId: Hex }) => {
  await deleteCommentFromSDK({
    commentId,
    commentsAddress: commentManagerAddress,
    writeContract: (opts) => writeContract(config, opts),
  });
};

export const getParentCommentFromCache = (
  queryClient: QueryClient,
  parentCommentId: Hex,
  rootCommentId: Hex,
): IndexerAPICommentSchemaType | undefined => {
  const existingCache = queryClient.getQueryData(["replies", rootCommentId]);

  const parsed = FetchCommentInfinityQuerySchema.safeParse(existingCache);

  if (!parsed.success) {
    console.error(
      "Failed to parse existing cache data, this is likely a bug. detailed error follows:",
      parsed.error,
    );
    console.error(existingCache);
    return;
  }

  return parsed.data.pages
    .flatMap((page) => page.results)
    .find((comment) => comment.id === parentCommentId);
};
