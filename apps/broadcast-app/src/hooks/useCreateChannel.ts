import { BroadcastHookABI } from "@/abi/generated/broadcast-hook-abi";
import { publicEnv } from "@/env/public";
import { createDiscoverChannelsQueryKey } from "@/queries/query-keys";
import { IndexerAPIMetadataSchema } from "@ecp.eth/sdk/indexer";
import { formatContractFunctionExecutionError } from "@ecp.eth/shared/helpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ContractFunctionExecutionError } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import z from "zod";

const channelDataSchema = z.object({
  name: z.string().trim().nonempty(),
  description: z.string().trim().optional(),
  metadata: IndexerAPIMetadataSchema.default([]),
  fee: z.bigint().min(0n),
});

type CreateChannelFormData = z.input<typeof channelDataSchema>;

export function useCreateChannel() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateChannelFormData) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!publicClient) {
          throw new Error("Public client not found");
        }

        const channelData = channelDataSchema.parse(data);

        const txHash = await writeContractAsync({
          address: publicEnv.NEXT_PUBLIC_BROADCAST_HOOK_ADDRESS,
          abi: BroadcastHookABI,
          functionName: "createChannel",
          args: [
            channelData.name,
            channelData.description ?? "",
            channelData.metadata,
          ],
          value: channelData.fee,
        });

        const txReceipt = await publicClient.waitForTransactionReceipt({
          hash: txHash,
        });

        return txReceipt;
      } catch (e) {
        if (e instanceof ContractFunctionExecutionError) {
          throw new Error(formatContractFunctionExecutionError(e));
        }

        console.error(e);

        throw e;
      }
    },
    onSuccess: () => {
      toast.success(
        "Channel created successfully. It can take a while to appear in the discover channels list.",
      );

      queryClient.refetchQueries({
        queryKey: [createDiscoverChannelsQueryKey()],
      });
    },
  });
}
