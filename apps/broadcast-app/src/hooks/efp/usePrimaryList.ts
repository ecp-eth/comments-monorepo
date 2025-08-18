import {
  efpAccountMetadataAbi,
  efpListMinterAbi,
} from "@/abi/generated/efp-abi";
import { publicEnv } from "@/env/public";
import { useConnectAccount } from "@/hooks/useConnectAccount";
import { isZeroHex } from "@ecp.eth/sdk/core";
import { isSameHex } from "@ecp.eth/shared/helpers";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import {
  type Chain,
  type Account,
  type Hex,
  isHex,
  type Transport,
  parseEventLogs,
  erc721Abi,
  encodeAbiParameters,
  decodeAbiParameters,
  padHex,
  getAddress,
  keccak256,
  concatHex,
  numberToHex,
  PublicClient,
  WalletClient,
} from "viem";
import { usePublicClient, useWalletClient } from "wagmi";

export class PrimaryListNotFoundError extends Error {
  constructor() {
    super("Primary list doesn't exist");
  }
}

type UsePrimaryListOptions = {
  /**
   * If false and the primary list doesn't exit, will throw an error
   * @default true
   */
  createIfNotExists?: boolean;
} & Omit<UseMutationOptions<bigint, Error, void>, "mutationFn">;

export function usePrimaryList({
  createIfNotExists = true,
  ...rest
}: UsePrimaryListOptions = {}) {
  const connectAccount = useConnectAccount();
  const publicClient = usePublicClient();
  const walletClient = useWalletClient();

  return useMutation({
    ...rest,
    mutationFn: async () => {
      const address = await connectAccount();

      if (!publicClient || !walletClient.data) {
        throw new Error(
          "You need to be connected to a wallet to get your primary list",
        );
      }

      let primaryListTokenId: bigint;

      const existingTokenId = await getPrimaryListTokenId(
        address,
        publicClient,
      );

      if (existingTokenId == null) {
        if (!createIfNotExists) {
          throw new PrimaryListNotFoundError();
        }

        const result = await createPrimaryList(
          address,
          publicClient,
          walletClient.data,
        );

        primaryListTokenId = result.verifiedTokenId;
      } else {
        primaryListTokenId = existingTokenId;
      }

      return primaryListTokenId;
    },
  });
}

async function getPrimaryListTokenId(
  address: Hex,
  client: PublicClient,
): Promise<bigint | null> {
  const raw = await client.readContract({
    address: publicEnv.NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS,
    abi: efpAccountMetadataAbi,
    functionName: "getValue",
    args: [address, "primary-list"],
  });

  if (!isHex(raw) || raw === "0x") {
    return null;
  }

  const [decodedTokenId] = decodeAbiParameters([{ type: "uint256" }], raw);

  return decodedTokenId;
}

async function createPrimaryList(
  address: Hex,
  client: PublicClient,
  walletClient: WalletClient<Transport, Chain, Account>,
): Promise<{
  tokenId: bigint;
  verifiedTokenId: bigint;
}> {
  const mintHash = await walletClient.writeContract({
    address: publicEnv.NEXT_PUBLIC_EFP_LIST_MINTER_ADDRESS,
    abi: efpListMinterAbi,
    functionName: "easyMint",
    args: [
      buildListStorageLocation({
        chainId: 8453n,
        managerAddress: address,
      }),
    ],
  });
  const mintReceipt = await client.waitForTransactionReceipt({
    hash: mintHash,
  });

  if (mintReceipt.status !== "success") {
    throw new Error("Failed to create primary list");
  }

  const transfers = parseEventLogs({
    logs: mintReceipt.logs,
    abi: erc721Abi,
    eventName: "Transfer",
  });

  const mineTransfer = transfers.find(
    (transfer) =>
      isSameHex(
        transfer.address,
        publicEnv.NEXT_PUBLIC_EFP_LIST_REGISTRY_ADDRESS,
      ) &&
      isZeroHex(transfer.args.from) &&
      isSameHex(transfer.args.to, address),
  );

  if (!mineTransfer) {
    throw new Error("Failed to create primary list");
  }

  const tokenId = mineTransfer.args.tokenId;
  const encodedTokenId = encodeAbiParameters([{ type: "uint256" }], [tokenId]);

  const setPrimaryListHash = await walletClient.writeContract({
    address: publicEnv.NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS,
    abi: efpAccountMetadataAbi,
    functionName: "setValue",
    args: ["primary-list", encodedTokenId],
  });
  const setPrimaryListReceipt = await client.waitForTransactionReceipt({
    hash: setPrimaryListHash,
  });

  if (setPrimaryListReceipt.status !== "success") {
    throw new Error("Failed to set primary list");
  }

  const raw = await client.readContract({
    address: publicEnv.NEXT_PUBLIC_EFP_ACCOUNT_METADATA_ADDRESS,
    abi: efpAccountMetadataAbi,
    functionName: "getValue",
    args: [address, "primary-list"],
  });

  const [decodedTokenId] = decodeAbiParameters([{ type: "uint256" }], raw);

  return {
    tokenId,
    verifiedTokenId: decodedTokenId,
  };
}

export function buildSlot(managerAddress: Hex, salt?: Hex): Hex {
  const manager20 = padHex(getAddress(managerAddress), { size: 20 });
  const randomSalt = keccak256(
    concatHex([manager20, numberToHex(Date.now(), { size: 32 })]),
  );
  const salt12: Hex = `0x${randomSalt.slice(2, 2 + 12 * 2)}`;
  const slot = concatHex([manager20, salt ?? salt12]);

  return slot;
}

export function buildListStorageLocation(args: {
  chainId: bigint;
  /**
   *
   */
  managerAddress: Hex; // the account who will manage the list
  /**
   * Optional 12-byte salt (if you want to fix it)
   */
  salt?: Hex;
}): Hex {
  const version: Hex = "0x01";
  const locType: Hex = "0x01";
  const chainId = numberToHex(args.chainId, { size: 32 });
  const recordsAddress = padHex(
    getAddress(publicEnv.NEXT_PUBLIC_EFP_LIST_RECORDS_ADDRESS),
    {
      size: 20,
    },
  );
  const slot = buildSlot(args.managerAddress, args.salt);
  const data = concatHex([chainId, recordsAddress, slot]);

  return concatHex([version, locType, data]);
}
