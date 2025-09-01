import { efpListRecordsAbi, efpListRegistryAbi } from "@/abi/generated/efp-abi";
import { publicEnv } from "@/env/public";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { decodeListStorageLocation } from "@ecp.eth/shared/ethereum-follow-protocol";
import { usePublicClient, useWalletClient } from "wagmi";
import { AssetId } from "caip";
import { CHANNEL_MANAGER_ADDRESS } from "@/wagmi/client";
import { usePrimaryList } from "./usePrimaryList";
import { encodeERC721Record, encodeListAddOp } from "@/lib/efp";

type UseAddERC721RecordToPrimaryListOptions = {
  channelId: bigint;
} & Omit<
  UseMutationOptions<void, Error, void>,
  "mutationFn" | "onSuccess" | "onError"
>;

export function useAddERC721RecordToPrimaryList({
  channelId,
}: UseAddERC721RecordToPrimaryListOptions) {
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();
  const { mutateAsync: getOrCreatePrimaryList } = usePrimaryList();

  return useMutation({
    mutationFn: async () => {
      if (!publicClient || !walletClient.data) {
        throw new Error(
          "You need to be connected to a wallet to add an ERC721 record to a primary list",
        );
      }

      const primaryListId = await getOrCreatePrimaryList();

      const location = await publicClient.readContract({
        abi: efpListRegistryAbi,
        address: publicEnv.NEXT_PUBLIC_EFP_LIST_REGISTRY_ADDRESS,
        functionName: "getListStorageLocation",
        args: [primaryListId],
      });

      const decodedLocation = decodeListStorageLocation(location);

      const caip = new AssetId({
        chainId: {
          namespace: "eip155",
          reference: publicClient.chain.id.toString(),
        },
        assetName: {
          namespace: "erc721",
          reference: CHANNEL_MANAGER_ADDRESS,
        },
        tokenId: channelId.toString(),
      });

      const applyListOpHash = await walletClient.data.writeContract({
        address: decodedLocation.recordsAddress,
        abi: efpListRecordsAbi,
        functionName: "applyListOp",
        args: [decodedLocation.slot, encodeListAddOp(encodeERC721Record(caip))],
      });
      const applyListOpReceipt = await publicClient.waitForTransactionReceipt({
        hash: applyListOpHash,
      });

      if (applyListOpReceipt.status !== "success") {
        throw new Error("Failed to add record to primary list");
      }
    },
  });
}
