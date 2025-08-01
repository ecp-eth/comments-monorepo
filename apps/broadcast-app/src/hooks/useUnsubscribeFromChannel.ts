import { publicEnv } from "@/env/public";
import sdk from "@farcaster/miniapp-sdk";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Channel } from "@/api/schemas";
import { toast } from "sonner";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { useRemoveChannelFromMyChannelsQuery } from "@/queries/my-channels";

type UseUnsubscribeToChannelOptions = {
  channel: Channel;
} & Omit<
  UseMutationOptions<void, Error, void>,
  "mutationFn" | "onSuccess" | "onError"
>;

export function useUnsubscribeToChannel({
  channel,
  ...options
}: UseUnsubscribeToChannelOptions) {
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const removeChannelFromMyChannelsQuery =
    useRemoveChannelFromMyChannelsQuery();

  return useMutation({
    ...options,
    mutationFn: async () => {
      const url = new URL(
        `/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels/${channel.id}/unsubscribe`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const response = await sdk.quickAuth.fetch(url, {
        method: "POST",
      });

      if (!response.ok) {
        console.error(
          `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
        );

        throw new Error("Server returned invalid response");
      }
    },
    onSuccess() {
      toast.success(`Unsubscribed from channel ${channel.name}`);

      removeChannelFromMyChannelsQuery(channel.id);

      updateChannelInChannelQuery(channel.id, {
        isSubscribed: false,
        notificationsEnabled: false,
      });
    },
    onError(error) {
      toast.error(`Failed to unsubscribe from channel: ${error.message}`);
    },
  });
}
