import { Hex } from "@ecp.eth/sdk/core";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { getApprovalStatusAndNonce } from "@/lib/contract";

export function getApprovalStatusQueryKey(connectedAddress: Hex | undefined) {
  return ["isPreapproved", connectedAddress];
}

export function useApprovalStatus() {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient();
  return useQuery({
    enabled: !!connectedAddress,
    queryKey: getApprovalStatusQueryKey(connectedAddress),
    queryFn: async () => {
      if (!connectedAddress) {
        throw new Error("No connected address");
      }

      if (!publicClient) {
        throw new Error("No public client");
      }

      // Check approval on chain and get nonce (multicall3 if available, otherwise read contracts)
      const [{ result: isApproved }, { result: nonce }] =
        await getApprovalStatusAndNonce(publicClient, connectedAddress);
      return {
        approved: isApproved,
        nonce,
      };
    },
  });
}
