import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import type { Channel } from "@/api/schemas";
import { toast } from "sonner";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { useRemoveChannelFromMyChannelsQuery } from "@/queries/my-channels";
import { useRemoveERC721RecordToPrimaryList } from "./efp/useRemoveERC721RecordFromPrimaryList";
import { useMiniAppContext } from "./useMiniAppContext";

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
  const { mutateAsync: removeERC721RecordFromPrimaryList } =
    useRemoveERC721RecordToPrimaryList({
      channelId: channel.id,
    });
  const miniAppContext = useMiniAppContext();

  return useMutation({
    ...options,
    mutationFn: async () => {
      await removeERC721RecordFromPrimaryList();
    },
    onSuccess() {
      toast.success(`Unsubscribed from channel ${channel.name}`);

      removeChannelFromMyChannelsQuery(channel.id);

      updateChannelInChannelQuery(channel.id, {
        isSubscribed: false,
        notificationSettings: {
          ...channel.notificationSettings,
          ...(miniAppContext.isInMiniApp && {
            [miniAppContext.client.clientFid]: false,
          }),
        },
      });
    },
    onError(error) {
      toast.error(`Failed to unsubscribe from channel: ${error.message}`);
    },
  });
}
