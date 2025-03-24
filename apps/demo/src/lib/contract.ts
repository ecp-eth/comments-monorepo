import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { CommentData } from "@ecp.eth/sdk/schemas";
import type { Hex } from "viem";
import type { UseWriteContractReturnType } from "wagmi";

type PostCommentViaContractParams = {
  commentData: CommentData;
  appSignature: Hex;
};

export const postCommentAsAuthorViaCommentsV1 = async (
  { appSignature, commentData }: PostCommentViaContractParams,
  writeContractAsync: UseWriteContractReturnType["writeContractAsync"]
) => {
  return await writeContractAsync({
    abi: CommentsV1Abi,
    address: COMMENTS_V1_ADDRESS,
    functionName: "postCommentAsAuthor",
    args: [commentData, appSignature],
  });
};
