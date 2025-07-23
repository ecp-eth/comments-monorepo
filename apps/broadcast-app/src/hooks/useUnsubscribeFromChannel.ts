import { publicEnv } from "@/env/public";
import sdk from "@farcaster/miniapp-sdk";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";

type UseUnsubscribeToChannelOptions = {
  channelId: bigint;
} & Omit<UseMutationOptions<void, Error, void>, "mutationFn">;

export function useUnsubscribeToChannel({
  channelId,
  ...options
}: UseUnsubscribeToChannelOptions) {
  return useMutation({
    ...options,
    mutationFn: async () => {
      const url = new URL(
        `/api/channels/${channelId}/unsubscribe`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const response = await sdk.quickAuth.fetch(url, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
        );
      }
    },
  });
}
