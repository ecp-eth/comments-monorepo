import { COMMENT_MANAGER_ADDRESS, CommentManagerABI } from "@ecp.eth/sdk";
import { Address, Chain, PublicClient, Transport } from "viem";

export async function getApprovalAndNonce<
  TTransport extends Transport,
  TChain extends Chain,
  TPublicClient extends PublicClient<TTransport, TChain> = PublicClient<
    TTransport,
    TChain
  >,
>(
  publicClient: TPublicClient,
  connectedAddress: Address,
  appSignerAddress: Address,
  chain: Chain,
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
              args: [connectedAddress, appSignerAddress],
            },
            {
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "getNonce",
              args: [connectedAddress, appSignerAddress],
            },
          ],
        })
      : (
          await Promise.all([
            publicClient.readContract({
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "isApproved",
              args: [connectedAddress, appSignerAddress],
            }),
            publicClient.readContract({
              address: COMMENT_MANAGER_ADDRESS,
              abi: CommentManagerABI,
              functionName: "getNonce",
              args: [connectedAddress, appSignerAddress],
            }),
          ])
        ).map((result) => ({ result }))
  ) as [{ result: boolean }, { result: bigint }];
}
