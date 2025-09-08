import { ContractFunctionExecutionError, type Hex } from "viem";
import { ERC165_ABI, ERC20_ABI } from "../extraABIs.js";
import type {
  ERC165ContractReadFunctions,
  ERC20ContractReadFunctions,
} from "../types.js";
import {
  INTERFACE_ID_ERC1155,
  INTERFACE_ID_ERC165,
  INTERFACE_ID_ERC721,
  NATIVE_ASSET_ADDRESS,
} from "../constants.js";

const erc20ProbeMethods: (keyof ERC20ContractReadFunctions)[] = [
  "name",
  "symbol",
  "decimals",
  "totalSupply",
];

/**
 * Get the type of the ERC type for an `ContractBasedAssetType`
 * @param param0 - The contract based asset
 * @returns
 */
export async function getERCType({
  contractAssetAddress,
  readContract,
}: {
  contractAssetAddress: Hex;
  readContract: ERC165ContractReadFunctions["supportsInterface"] &
    ERC20ContractReadFunctions["name"] &
    ERC20ContractReadFunctions["symbol"] &
    ERC20ContractReadFunctions["decimals"] &
    ERC20ContractReadFunctions["totalSupply"];
}): Promise<"unknown" | "erc20" | "erc721" | "erc1155"> {
  if (
    contractAssetAddress.toLowerCase() === NATIVE_ASSET_ADDRESS.toLowerCase()
  ) {
    throw new Error("This is not a contract based asset");
  }

  try {
    const isErc165 = await readContract({
      abi: ERC165_ABI,
      address: contractAssetAddress,
      functionName: "supportsInterface",
      args: [INTERFACE_ID_ERC165],
    });

    if (!isErc165) {
      // Asset supports erc165 but saying it is not an ERC165 contract,
      // something is wrong with the contract, we don't support such case.
      throw new Error("Invalid ERC165 contract");
    }

    const isErc721 = await readContract({
      abi: ERC165_ABI,
      address: contractAssetAddress,
      functionName: "supportsInterface",
      args: [INTERFACE_ID_ERC721],
    });

    if (isErc721) {
      return "erc721";
    }

    const isErc1155 = await readContract({
      abi: ERC165_ABI,
      address: contractAssetAddress,
      functionName: "supportsInterface",
      args: [INTERFACE_ID_ERC1155],
    });

    if (isErc1155) {
      return "erc1155";
    }
  } catch (error) {
    if (error instanceof ContractFunctionExecutionError) {
      // erc20 predates erc165, so if it is likely to be an erc20 if supportsInterface fails
      // let's check known erc20 read methods/props to confirm
      for (const method of erc20ProbeMethods) {
        try {
          const result = await readContract({
            abi: ERC20_ABI,
            address: contractAssetAddress,
            functionName: method,
          });

          if (result == null) {
            return "unknown";
          }
        } catch {
          return "unknown";
        }
      }

      // above reads all good? then very very likely to be an erc20
      return "erc20";
    }
    throw error;
  }

  return "unknown";
}
