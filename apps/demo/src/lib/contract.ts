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
import { eip7702Actions } from "viem/experimental";
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
  >;
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
  >;
  walletClient: WalletClient<any, any, Account>;
}): Promise<WriteContractReturnType> {
  const eip7702wallet = walletClient.extend(eip7702Actions());

  await eip7702wallet.switchChain({ id: chain.id });

  // uses current account, that is json-rpc account
  // therefore at the moment this is not working since viem doesn't support it
  const authorization = await eip7702wallet.signAuthorization({
    contractAddress:
      publicEnv.NEXT_PUBLIC_BATCH_CALL_DELEGATION_PROTOCOL_ADDRESS,
  });

  return await walletClient.writeContract({
    address: eip7702wallet.account.address,
    abi: BATCH_CALL_DELEGATION_CONTRACT_ABI,
    functionName: "execute",
    args,
    chain,
    authorizationList: [authorization],
  });
}
