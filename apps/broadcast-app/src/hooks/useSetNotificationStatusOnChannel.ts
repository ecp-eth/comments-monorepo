import { publicEnv } from "@/env/public";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";

const responseSchema = z.object({
  channelId: z.coerce.bigint(),
  notificationsEnabled: z.boolean(),
});

type Response = z.infer<typeof responseSchema>;

type UseSetNotificationStatusOnChannelOptions = {
  channelId: bigint;
} & Omit<UseMutationOptions<Response, Error, boolean>, "mutationFn">;

export function useSetNotificationStatusOnChannel({
  channelId,
  ...options
}: UseSetNotificationStatusOnChannelOptions) {
  return useMutation({
    ...options,
    mutationFn: async (notificationsEnabled: boolean) => {
      const response = await fetch(
        `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/channels/${channelId}/subscription`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ notificationsEnabled }),
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
