import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { CommentData } from "@ecp.eth/sdk/schemas";
import { Address, Chain, Hex, PublicClient, Transport } from "viem";
import { UseWriteContractReturnType } from "wagmi";
import { chain } from "@/lib/wagmi";
import { publicEnv } from "@/publicEnv";

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

export const getApprovalStatusAndNonce = async <
  TTransport extends Transport,
  TChain extends Chain,
  TPublicClient extends PublicClient<TTransport, TChain> = PublicClient<
    TTransport,
    TChain
  >,
>(
  publicClient: TPublicClient,
  connectedAddress: Address
): Promise<[{ result: boolean }, { result: bigint }]> => {
  return (
    chain.contracts?.multicall3
      ? await publicClient.multicall({
          contracts: [
            {
              address: COMMENTS_V1_ADDRESS,
              abi: CommentsV1Abi,
              functionName: "isApproved",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            },
            {
              address: COMMENTS_V1_ADDRESS,
              abi: CommentsV1Abi,
              functionName: "nonces",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            },
          ],
        })
      : (
          await Promise.all([
            publicClient.readContract({
              address: COMMENTS_V1_ADDRESS,
              abi: CommentsV1Abi,
              functionName: "isApproved",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            }),
            publicClient.readContract({
              address: COMMENTS_V1_ADDRESS,
              abi: CommentsV1Abi,
              functionName: "nonces",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            }),
          ])
        ).map((result) => ({ result }))
  ) as [{ result: boolean }, { result: bigint }];
};
