import {
  COMMENTS_V1_ADDRESS,
  CommentsV1Abi,
  createCommentSuffixData,
} from "@ecp.eth/sdk";
import { CommentData } from "@ecp.eth/sdk/schemas";
import { Hex, parseAbi } from "viem";
import { UseWriteContractReturnType } from "wagmi";
import never from "never";
import { publicEnv } from "@/publicEnv";

type PostCommentViaContractParams = {
  commentData: CommentData;
  appSignature: Hex;
};

export const postCommentViaYoink = async (
  { appSignature, commentData }: PostCommentViaContractParams,
  writeContractAsync: UseWriteContractReturnType["writeContractAsync"]
) => {
  const commentDataSuffix = createCommentSuffixData({
    commentData,
    appSignature,
  });

  return await writeContractAsync({
    address:
      publicEnv.NEXT_PUBLIC_YOINK_CONTRACT_ADDRESS ??
      never("Yoink contract address is not set"),
    abi: parseAbi(["function yoink()"]),
    functionName: "yoink",
    args: [],
    dataSuffix: commentDataSuffix,
  });
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
