import { waitForTransactionReceipt } from "@wagmi/core";
import { fetchAPI } from "./fetch";
import { Hex, TransactionReceipt } from "viem";
import { CommentData } from "@ecp.eth/sdk/schemas";
import {
  SignCommentPayloadRequestSchemaType,
  SignCommentResponseClientSchema,
} from "./generated/schemas";
import {
  deleteCommentAsAuthorViaCommentsV1,
  postCommentAsAuthorViaCommentsV1,
} from "./contracts";
import { chain, config } from "../wagmi.config";
import { bigintReplacer } from "@ecp.eth/shared/helpers";

const chainId = chain.id;

type PostCommentResponse = {
  receipt: TransactionReceipt;
  txHash: Hex;
  commentData: CommentData;
  appSignature: Hex;
  commentId: Hex;
};

export const postComment = async (
  comment: SignCommentPayloadRequestSchemaType
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
    SignCommentResponseClientSchema
  );

  const {
    data: commentData,
    signature: appSignature,
    hash: commentId,
  } = signed;

  const txHash = await postCommentAsAuthorViaCommentsV1({
    commentData,
    appSignature,
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
  await deleteCommentAsAuthorViaCommentsV1({
    commentId,
  });
};
