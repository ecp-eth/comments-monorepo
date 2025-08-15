import { efpListRecordsAbi, efpListRegistryAbi } from "@/abi/generated/efp-abi";
import { publicEnv } from "@/env/public";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import {
  stringToHex,
  concatHex,
  type Hex,
  numberToHex,
  sliceHex,
  hexToNumber,
  hexToBigInt,
  getAddress,
} from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { AssetId } from "caip";
import { CHANNEL_MANAGER_ADDRESS } from "@/wagmi/config";
import { usePrimaryList } from "./usePrimaryList";

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

      const decodedLocation = decodeListLocation(location);

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
        address: publicEnv.NEXT_PUBLIC_EFP_LIST_RECORDS_ADDRESS,
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

function decodeListLocation(location: Hex): {
  version: number;
  locationType: number;
  chainId: bigint;
  recordsAddress: Hex;
  slot: bigint;
} {
  const version = hexToNumber(sliceHex(location, 0, 1), { size: 1 });
  const locationType = hexToNumber(sliceHex(location, 1, 2), { size: 1 });

  if (version !== 1 || locationType !== 1) {
    throw new Error("Invalid list location");
  }

  const chainId = hexToBigInt(sliceHex(location, 2, 34));
  const recordsAddress = getAddress(sliceHex(location, 34, 54));
  const slot = hexToBigInt(sliceHex(location, 54, 86));

  return {
    version,
    locationType,
    chainId,
    recordsAddress,
    slot,
  };
}

function encodeListAddOp(record: Hex): Hex {
  const opVersion = numberToHex(1, { size: 1 });
  const op = numberToHex(1, { size: 1 });

  return concatHex([opVersion, op, record]);
}

function encodeERC721Record(caip: AssetId): Hex {
  const version: Hex = "0x80";
  const type: Hex = "0x80";
  const data = stringToHex(caip.toString());

  return concatHex([version, type, data]);
}
