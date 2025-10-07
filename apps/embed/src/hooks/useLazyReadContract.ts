import {
  Abi,
  ContractFunctionArgs,
  ContractFunctionName,
  ReadContractParameters,
  ReadContractReturnType,
} from "viem";
import { usePublicClient } from "wagmi";

export const useLazyReadContract = () => {
  const publicClient = usePublicClient();

  return {
    readContractAsync: <
      const abi extends Abi | readonly unknown[],
      functionName extends ContractFunctionName<abi, "pure" | "view">,
      const args extends ContractFunctionArgs<
        abi,
        "pure" | "view",
        functionName
      >,
    >(
      args: ReadContractParameters<abi, functionName, args>,
    ): Promise<ReadContractReturnType<abi, functionName, args>> => {
      if (!publicClient) {
        throw new Error("Public client not found");
      }

      return publicClient.readContract(args);
    },
  };
};
