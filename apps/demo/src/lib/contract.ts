import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import type { CommentData } from "@ecp.eth/sdk/schemas";
import {
  type Account,
  encodeFunctionData,
  type ContractFunctionArgs,
  type Hex,
  type WalletClient,
  type WriteContractReturnType,
} from "viem";
import type { UseWriteContractReturnType } from "wagmi";
import { BATCH_CALL_DELEGATION_CONTRACT_ABI } from "./abis";
import { publicEnv } from "@/publicEnv";
import { chain } from "./wagmi";
import type { SignCommentResponseClientSchemaType } from "@ecp.eth/shared/schemas";

type PostCommentViaContractParams = {
  commentData: CommentData;
  appSignature: Hex;
};

export async function postCommentAsAuthorViaCommentsV1(
  { appSignature, commentData }: PostCommentViaContractParams,
  writeContractAsync: UseWriteContractReturnType["writeContractAsync"]
): Promise<WriteContractReturnType> {
  return await writeContractAsync({
    abi: CommentsV1Abi,
    address: COMMENTS_V1_ADDRESS,
    functionName: "postCommentAsAuthor",
    args: [commentData, appSignature],
  });
}

export async function postCommentAsAuthorInBatch({
  args,
  signedComment,
  walletClient,
}: {
  args: ContractFunctionArgs<
    typeof BATCH_CALL_DELEGATION_CONTRACT_ABI,
    "payable",
    "execute"
  >[number];
  signedComment: SignCommentResponseClientSchemaType;
  walletClient: WalletClient<any, any, Account>;
}) {
  return sendBatchedTransaction({
    args: [
      {
        to: COMMENTS_V1_ADDRESS,
        data: encodeFunctionData({
          abi: CommentsV1Abi,
          functionName: "postCommentAsAuthor",
          args: [signedComment.data, signedComment.signature],
        }),
        value: 0n,
      },
      ...args,
    ],
    walletClient,
  });
}

export async function sendBatchedTransaction({
  args,
  walletClient,
}: {
  args: ContractFunctionArgs<
    typeof BATCH_CALL_DELEGATION_CONTRACT_ABI,
    "payable",
    "execute"
  >[number];
  walletClient: WalletClient<any, any, Account>;
}): Promise<WriteContractReturnType> {
  const wallet = walletClient;

  await wallet.switchChain({ id: chain.id });

  const authorization = await wallet.signAuthorization({
    contractAddress:
      publicEnv.NEXT_PUBLIC_BATCH_CALL_DELEGATION_PROTOCOL_ADDRESS,
    executor: "self",
  });

  return await walletClient.writeContract({
    address: wallet.account.address,
    abi: BATCH_CALL_DELEGATION_CONTRACT_ABI,
    functionName: "execute",
    args: [args],
    chain,
    authorizationList: [authorization],
  });
}
