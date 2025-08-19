import { publicEnv } from "@/env/public";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { type MiniAppContext } from "./useMiniAppContext";

const responseSchema = z.object({
  channelId: z.coerce.bigint(),
  notificationsEnabled: z.boolean(),
});

type Response = z.infer<typeof responseSchema>;

type UseSetNotificationStatusOnChannelOptions = {
  channelId: bigint;
  miniAppContext: MiniAppContext;
} & Omit<UseMutationOptions<Response, Error, boolean>, "mutationFn">;

export function useSetNotificationStatusOnChannel({
  channelId,
  miniAppContext,
  ...options
}: UseSetNotificationStatusOnChannelOptions) {
  return useMutation({
    ...options,
    mutationFn: async (notificationsEnabled: boolean) => {
      if (!miniAppContext.isInMiniApp) {
        throw new Error("Not in mini app");
      }

      const response = await fetch(
        `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels/${channelId}/farcaster/${miniAppContext.client.clientFid}/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userFid: miniAppContext.user.fid,
            notificationsEnabled,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update notification status:\n\nStatus: ${response.statusText}\n\nResponse: ${await response.text()}`,
        );
      }

      const responseData = await responseSchema
        .promise()
        .parse(response.json());

      return responseData;
    },
  });
}
