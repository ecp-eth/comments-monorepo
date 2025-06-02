import { COMMENT_MANAGER_ADDRESS, CommentManagerABI } from "@ecp.eth/sdk";
import { Hex } from "viem";
import { writeContract } from "@wagmi/core";
import { config } from "../wagmi.config";
import type { CreateCommentData } from "@ecp.eth/sdk/comments/schemas";

type PostCommentViaCommentsV1Params = {
  commentData: CreateCommentData;
  appSignature: Hex;
};

export const postCommentAsViaCommentsV1 = async ({
  appSignature,
  commentData,
}: PostCommentViaCommentsV1Params) => {
  return await writeContract(config, {
    abi: CommentManagerABI,
    functionName: "postComment",
    address: COMMENT_MANAGER_ADDRESS,
    args: [commentData, appSignature],
  });
};

type DeleteCommentViaCommentsV1Params = {
  commentId: Hex;
};

export const deleteCommentViaCommentsV1 = async ({
  commentId,
}: DeleteCommentViaCommentsV1Params) => {
  return await writeContract(config, {
    abi: CommentManagerABI,
    functionName: "deleteComment",
    address: COMMENT_MANAGER_ADDRESS,
    args: [commentId],
  });
};
