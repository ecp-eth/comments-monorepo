import { publicEnv } from "@/env/public";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { useMiniAppContext } from "./useMiniAppContext";

export class AlreadySubscribedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AlreadySubscribedError";
  }
}

const responseSchema = z.object({
  channelId: z.coerce.bigint(),
  notificationsEnabled: z.boolean(),
});

type Response = z.infer<typeof responseSchema>;

type UseSubscribeToChannelOptions = {
  channelId: bigint;
} & Omit<UseMutationOptions<Response, Error, void>, "mutationFn">;

export function useSubscribeToChannel({
  channelId,
  ...options
}: UseSubscribeToChannelOptions) {
  const miniAppContext = useMiniAppContext();

  return useMutation({
    ...options,
    mutationFn: async () => {
      let notificationsEnabled = !!miniAppContext.client.notificationDetails;

      if (!miniAppContext.client.added) {
        const result = await sdk.actions.addMiniApp();

        notificationsEnabled = !!result.notificationDetails;
      }

      const url = new URL(
        `/api/channels/${channelId}/subscribe`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );

      const response = await sdk.quickAuth.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationsEnabled }),
      });

      if (response.status === 409) {
        throw new AlreadySubscribedError(
          `You are already subscribed to channel ${channelId}`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
        );
      }

      const responseData = await responseSchema
        .promise()
        .parse(response.json());

      return responseData;
    },
  });
}
