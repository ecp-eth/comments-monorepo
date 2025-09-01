import { BroadcastHookABI } from "@/abi/generated/broadcast-hook-abi";
import { usePinataUpload } from "@/hooks/use-pinata-upload";
import { publicEnv } from "@/env/public";
import { createChannelsQueryKey } from "@/queries/query-keys";
import { createMetadataEntry } from "@ecp.eth/sdk/comments";
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
  logo: z.instanceof(File).nullable(),
});

type CreateChannelFormData = z.input<typeof channelDataSchema>;

export function useCreateChannel() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const pinataUpload = usePinataUpload();

  return useMutation({
    mutationFn: async (data: CreateChannelFormData) => {
      try {
        if (!publicClient) {
          throw new Error("Public client not found");
        }

        const channelMetadata = [...(data.metadata || [])];

        if (data.logo) {
          const pinataUploadResponse = await pinataUpload(data.logo);

          channelMetadata.push(
            createMetadataEntry("image", "string", pinataUploadResponse.url),
          );
          channelMetadata.push(
            createMetadataEntry(
              "image_cid",
              "string",
              pinataUploadResponse.cid,
            ),
          );
          channelMetadata.push(
            createMetadataEntry(
              "image_mime_type",
              "string",
              pinataUploadResponse.mimeType,
            ),
          );
        }

        const channelData = channelDataSchema.parse({
          ...data,
          metadata: channelMetadata,
        });

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
        "Channel created successfully. It can take a while to appear in the channels list.",
      );

      queryClient.refetchQueries({
        queryKey: createChannelsQueryKey(),
      });
    },
  });
}
