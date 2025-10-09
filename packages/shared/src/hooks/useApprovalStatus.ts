import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { getApprovalAndNonce } from "../helpers/getApprovalAndNonce";
import { Address, Chain } from "viem";

export function useApprovalStatus(appSignerAddress: Address, chain: Chain) {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  return useQuery({
    enabled: !!connectedAddress,
    queryKey: ["isPreapproved", connectedAddress],
    queryFn: async () => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      if (!publicClient) {
        throw new Error("No public client");
      }

      // Check approval on chain and get nonce (multicall3 if available, otherwise read contracts)
      const [{ result: isApproved }, { result: nonce }] =
        await getApprovalAndNonce(
          publicClient,
          connectedAddress,
          appSignerAddress,
          chain,
        );
      return {
        approved: isApproved,
        nonce,
      };
    },
  });
}
