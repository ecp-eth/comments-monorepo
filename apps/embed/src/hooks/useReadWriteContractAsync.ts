import { useSignTypedData, useWriteContract } from "wagmi";
import { useLazyReadContract } from "./useLazyReadContract";

export const useReadWriteContractAsync = () => {
  const { readContractAsync } = useLazyReadContract();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  return { readContractAsync, writeContractAsync, signTypedDataAsync };
};
