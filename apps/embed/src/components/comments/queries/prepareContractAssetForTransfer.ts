import { ERC20_ABI } from "@ecp.eth/sdk";
import { ContractBasedAssetType } from "@ecp.eth/sdk/channel-manager";
import { Hex } from "@ecp.eth/sdk/core/schemas";
import { PublicClient, Transport, Chain, Account, WalletClient } from "viem";
import { ERC721_ABI, ERC1155_ABI } from "@/lib/abi";

type PrepareContractAssetForTransferParams = {
  contractAsset: ContractBasedAssetType;
  hook: Hex;
  author: Hex;
  tokenId?: bigint;
  publicClient: PublicClient<Transport, Chain, undefined>;
  walletClient: WalletClient<Transport, Chain, Account>;
};

export async function prepareContractAssetForTransfer({
  contractAsset,
  hook,
  author,
  tokenId,
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
    case "erc721": {
      if (!tokenId) {
        throw new Error("Token ID is required for ERC721");
      }

      // Check if the user owns the token
      const owner = await publicClient.readContract({
        abi: ERC721_ABI,
        address: contractAsset.address,
        functionName: "ownerOf",
        args: [tokenId],
      });

      if (owner.toLowerCase() !== author.toLowerCase()) {
        throw new Error("User does not own the ERC721 token");
      }

      // Check if the comment manager is approved for this specific token
      const approved = await publicClient.readContract({
        abi: ERC721_ABI,
        address: contractAsset.address,
        functionName: "getApproved",
        args: [tokenId],
      });

      const isTokenApproved = approved.toLowerCase() === hook.toLowerCase();

      if (isTokenApproved) {
        return;
      }

      // If token is not approved check if the comment manager is approved for all tokens
      const isApprovedForAll = await publicClient.readContract({
        abi: ERC721_ABI,
        address: contractAsset.address,
        functionName: "isApprovedForAll",
        args: [author, hook],
      });

      if (isApprovedForAll) {
        return;
      }

      // request approval for the token
      const txHash = await walletClient.writeContract({
        abi: ERC721_ABI,
        address: contractAsset.address,
        functionName: "approve",
        args: [hook, tokenId],
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      return;
    }
    case "erc1155": {
      if (!tokenId) {
        throw new Error("Token ID is required for ERC1155");
      }

      // Check if the user has the token
      const balance = await publicClient.readContract({
        abi: ERC1155_ABI,
        address: contractAsset.address,
        functionName: "balanceOf",
        args: [author, tokenId],
      });

      if (balance === 0n) {
        throw new Error("User does not own the ERC1155 token");
      }

      // Check if the hook is approved for all tokens
      const isApprovedForAll = await publicClient.readContract({
        abi: ERC1155_ABI,
        address: contractAsset.address,
        functionName: "isApprovedForAll",
        args: [author, hook],
      });

      if (isApprovedForAll) {
        return;
      }

      // Request approval for all tokens
      const txHash = await walletClient.writeContract({
        abi: ERC1155_ABI,
        address: contractAsset.address,
        functionName: "setApprovalForAll",
        args: [hook, true],
      });

      await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      return;
    }
    default:
      tokenType satisfies never;
      throw new Error("Unknown token type");
  }
}
