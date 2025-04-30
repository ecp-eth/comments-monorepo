import { COMMENT_MANAGER_ADDRESS, CommentManagerAbi } from "@ecp.eth/sdk";
import { CommentData } from "@ecp.eth/sdk/comments/types";
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
    abi: CommentManagerAbi,
    functionName: "postCommentAsAuthor",
    address: COMMENT_MANAGER_ADDRESS,
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
    abi: CommentManagerAbi,
    functionName: "deleteCommentAsAuthor",
    address: COMMENT_MANAGER_ADDRESS,
    args: [commentId],
  });
};
