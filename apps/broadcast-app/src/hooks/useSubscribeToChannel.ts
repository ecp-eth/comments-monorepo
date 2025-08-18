import { publicEnv } from "@/env/public";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { z } from "zod";
import { useMiniAppContext } from "./useMiniAppContext";
import { useRemoveChannelFromDiscoverQuery } from "@/queries/discover-channels";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { toast } from "sonner";
import type { Channel } from "@/api/schemas";
import { useAddERC721RecordToPrimaryList } from "./efp/useAddERC721RecordToPrimaryList";
import { UnauthorizedError } from "@/errors";

const responseSchema = z.object({
  channelId: z.coerce.bigint(),
  notificationsEnabled: z.boolean(),
});

type Response = z.infer<typeof responseSchema> | false;

type UseSubscribeToChannelOptions = {
  channel: Channel;
} & Omit<
  UseMutationOptions<Response, Error, void>,
  "mutationFn" | "onSuccess" | "onError"
>;

export function useSubscribeToChannel({
  channel,
  ...options
}: UseSubscribeToChannelOptions) {
  const miniAppContext = useMiniAppContext();
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const removeChannelFromDiscoverQuery = useRemoveChannelFromDiscoverQuery();
  const { mutateAsync: addERC721RecordToPrimaryList } =
    useAddERC721RecordToPrimaryList({
      channelId: channel.id,
    });

  return useMutation({
    ...options,
    mutationFn: async () => {
      let notificationsEnabled = false;

      if (miniAppContext.isInMiniApp) {
        notificationsEnabled = !!miniAppContext.client.notificationDetails;

        if (!miniAppContext.client.added) {
          const result = await sdk.actions.addMiniApp();

          notificationsEnabled = !!result.notificationDetails;
        }

        // store notification settings
        await storeNotificationSettings({
          userFid: miniAppContext.user.fid,
          notificationsEnabled,
        });
      }

      await addERC721RecordToPrimaryList();

      return {
        channelId: channel.id,
        notificationsEnabled,
      };
    },
    onError(error) {
      // @todo more human friendly error message in case of wallet (RPC) error
      toast.error(`Failed to subscribe to channel: ${error.message}`);
    },
    onSuccess(data) {
      toast.success(`Subscribed to channel ${channel.name}`);

      removeChannelFromDiscoverQuery(channel.id);

      updateChannelInChannelQuery(channel.id, {
        isSubscribed: true,
        notificationsEnabled: data ? data.notificationsEnabled : false,
      });
    },
  });
}

async function storeNotificationSettings(params: {
  notificationsEnabled: boolean;
  userFid: number;
}): Promise<Response> {
  const response = await fetch(
    `/api/indexer/api/apps/${publicEnv.NEXT_PUBLIC_APP_SIGNER_ADDRESS}/farcaster/settings`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    },
  );

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    console.error(
      `Failed to subscribe to channel:\n\nStatus: ${response.status}\n\nResponse: ${await response.text()}`,
    );

    throw new Error("Server returned invalid response");
  }

  const responseData = await responseSchema.promise().parse(response.json());

  return responseData;
}
