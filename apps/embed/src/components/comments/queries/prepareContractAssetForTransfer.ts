import { ERC20_ABI } from "@ecp.eth/sdk";
import { ContractBasedAssetType } from "@ecp.eth/sdk/channel-manager";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { PublicClient, Transport, Chain, Account, WalletClient } from "viem";

type PrepareContractAssetForTransferParams = {
  contractAsset: ContractBasedAssetType;
  hook: Hex;
  author: Hex;
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
};

export async function prepareContractAssetForTransfer({
  contractAsset,
  hook,
  author,
  publicClient,
  walletClient,
}: PrepareContractAssetForTransferParams) {
  const tokenType = contractAsset.type;

  switch (tokenType) {
    case "unknown":
      throw new Error("Unknown token type");
    case "erc20": {
      // Check current allowance
      const allowance = await publicClient.readContract({
        abi: ERC20_ABI,
        address: contractAsset.address,
        functionName: "allowance",
        args: [author, hook],
      });

      if (contractAsset.amount <= allowance) {
        return;
      }

      const txHash = await walletClient.writeContract({
        abi: ERC20_ABI,
        address: contractAsset.address,
        functionName: "approve",
        args: [hook, contractAsset.amount],
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      return;
    }
    case "erc721":
    case "erc1155": {
      // According to discussions in ECPIP https://github.com/ecp-eth/ECPIP/discussions/3
      // we decided to drop returning tokenId as it is niche case, so not worth the complexity
      throw new Error("ERC721 and ERC1155 are not supported");
    }
    default:
      tokenType satisfies never;
      throw new Error("Unknown token type");
  }
}
