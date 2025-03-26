import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { CommentData } from "@ecp.eth/sdk/schemas";
import { Hex } from "viem";
import { writeContract } from "@wagmi/core";
import { config } from "../wagmi.config";

type PostCommentViaCommentsV1Params = {
  commentData: CommentData;
  appSignature: Hex;
};

export const postCommentAsAuthorViaCommentsV1 = async ({
  appSignature,
  commentData,
}: PostCommentViaCommentsV1Params) => {
  return await writeContract(config, {
    abi: CommentsV1Abi,
    functionName: "postCommentAsAuthor",
    address: COMMENTS_V1_ADDRESS,
    args: [commentData, appSignature],
  });
};

type DeleteCommentViaCommentsV1Params = {
  commentId: Hex;
};

export const deleteCommentAsAuthorViaCommentsV1 = async ({
  commentId,
}: DeleteCommentViaCommentsV1Params) => {
  return await writeContract(config, {
    abi: CommentsV1Abi,
    functionName: "deleteCommentAsAuthor",
    address: COMMENTS_V1_ADDRESS,
    args: [commentId],
  });
};
