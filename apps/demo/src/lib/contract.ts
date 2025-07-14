import { COMMENT_MANAGER_ADDRESS, CommentManagerABI } from "@ecp.eth/sdk";
import { Address, Chain, PublicClient, Transport } from "viem";
import { chain } from "@/lib/clientWagmi";
import { publicEnv } from "@/publicEnv";

export async function getApprovalStatusAndNonce<
  TTransport extends Transport,
  TChain extends Chain,
  TPublicClient extends PublicClient<TTransport, TChain> = PublicClient<
    TTransport,
    TChain
  >,
>(
  publicClient: TPublicClient,
  connectedAddress: Address,
): Promise<[{ result: boolean }, { result: bigint }]> {
  return (
    chain.contracts &&
    "multicall3" in chain.contracts &&
    chain.contracts.multicall3
      ? await publicClient.multicall({
          contracts: [
            {
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "isApproved",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            },
            {
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "getNonce",
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
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "isApproved",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            }),
            publicClient.readContract({
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "getNonce",
              args: [
                connectedAddress,
                publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS,
              ],
            }),
          ])
        ).map((result) => ({ result }))
  ) as [{ result: boolean }, { result: bigint }];
}
