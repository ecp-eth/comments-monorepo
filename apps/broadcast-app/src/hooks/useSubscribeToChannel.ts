import { MiniAppNotificationDetails, sdk } from "@farcaster/miniapp-sdk";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useMiniAppContext } from "./useMiniAppContext";
import { useRemoveChannelFromDiscoverQuery } from "@/queries/discover-channels";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { toast } from "sonner";
import type { Channel } from "@/api/schemas";
import { useAddERC721RecordToPrimaryList } from "./efp/useAddERC721RecordToPrimaryList";
import {
  type SetMiniAppNotificationStatusResponse,
  useSetMiniAppNotificationsStatus,
} from "./useSetMiniAppNotificationsStatus";
import { useAuthProtect } from "@/components/auth-provider";

type UseSubscribeToChannelOptions = {
  channel: Channel;
} & Omit<
  UseMutationOptions<SetMiniAppNotificationStatusResponse, Error, void>,
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

  const {
    mutateAsync: setNotificationSettings,
    error: setNotificationSettingsError,
  } = useSetMiniAppNotificationsStatus();

  useAuthProtect(setNotificationSettingsError);

  return useMutation({
    ...options,
    mutationFn: async () => {
      let notificationDetails: MiniAppNotificationDetails | undefined =
        undefined;

      if (miniAppContext.isInMiniApp) {
        notificationDetails = miniAppContext.client.notificationDetails;

        if (!miniAppContext.client.added) {
          const result = await sdk.actions.addMiniApp();

          notificationDetails = result.notificationDetails;
        }

        // store notification settings
        await setNotificationSettings({
          miniAppContext,
          notificationDetails,
        });
      }

      await addERC721RecordToPrimaryList();

      return {
        channelId: channel.id,
        notificationsEnabled: !!notificationDetails,
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
