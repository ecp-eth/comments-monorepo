import { chain, transport } from "@/lib/wagmi";
import { publicEnv } from "@/publicEnv";
import { COMMENTS_V1_ADDRESS, CommentsV1Abi } from "@ecp.eth/sdk";
import { useQuery } from "@tanstack/react-query";
import { createPublicClient } from "viem";
import { useAccount } from "wagmi";

export function useApprovalStatus() {
  const { address: connectedAddress } = useAccount();
  return useQuery({
    enabled: !!connectedAddress,
    queryKey: ["isPreapproved", connectedAddress],
    queryFn: async () => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      const publicClient = createPublicClient({
        chain,
        transport,
      });

      // Check approval on chain and get nonce (multicall3 if available, otherwise read contracts)
      const [{ result: isApproved }, { result: nonce }] = (
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
      return {
        approved: isApproved,
        nonce,
      };
    },
  });
}
