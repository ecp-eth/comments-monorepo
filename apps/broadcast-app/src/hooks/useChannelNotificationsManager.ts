import type { Channel } from "@/api/schemas";
import { useMiniAppContext } from "./useMiniAppContext";
import { useSetNotificationStatusOnChannel } from "./useSetNotificationStatusOnChannel";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { sdk, AddMiniApp } from "@farcaster/miniapp-sdk";
import { useMemo } from "react";
import { toast } from "sonner";
import { useUpdateChannelInChannelQuery } from "@/queries/channel";
import { useUpdateChannelInMyChannelsQuery } from "@/queries/my-channels";

type Status =
  | "enabled"
  | "disabled"
  | "not-subscribed"
  | "app-not-added"
  | "app-disabled-notifications";

type ChannelManagerAPI = {
  status: Status;
  enableMutation: UseMutationResult<void, Error, void>;
  disableMutation: UseMutationResult<void, Error, void>;
};

export function useChannelNotificationsManager(
  channel: Channel,
): ChannelManagerAPI {
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const updateChannelInMyChannelsQuery = useUpdateChannelInMyChannelsQuery();
  const miniAppContext = useMiniAppContext();
  const setNotificationStatusMutation = useSetNotificationStatusOnChannel({
    channelId: channel.id,
  });

  const isAppAdded = miniAppContext.isInMiniApp && miniAppContext.client.added;
  const doesAppHaveNotificationsEnabled =
    miniAppContext.isInMiniApp && !!miniAppContext.client.notificationDetails;
  const hasChannelNotificationsEnabled = channel.notificationsEnabled;

  let status: Status;

  if (!channel.isSubscribed) {
    status = "not-subscribed";
  } else if (!isAppAdded) {
    status = "app-not-added";
  } else if (!doesAppHaveNotificationsEnabled) {
    status = "app-disabled-notifications";
  } else if (hasChannelNotificationsEnabled) {
    status = "enabled";
  } else {
    status = "disabled";
  }

  const enableMutation = useMutation({
    mutationFn: async () => {
      let result: AddMiniApp.AddMiniAppResult | undefined;

      if (status === "not-subscribed") {
        throw new Error(
          "You need to subscribe to the channel to enable notifications",
        );
      }

      if (status === "app-not-added") {
        result = await sdk.actions.addMiniApp();
      }

      if (
        (result && !result.notificationDetails) ||
        status === "app-disabled-notifications"
      ) {
        throw new Error("Mini app does not have notifications enabled");
      }

      return setNotificationStatusMutation.mutate(true);
    },
    onSuccess() {
      toast.success("Notifications enabled");

      updateChannelInChannelQuery(channel.id, {
        notificationsEnabled: true,
      });
      updateChannelInMyChannelsQuery(channel.id, {
        notificationsEnabled: true,
      });
    },
    onError(error) {
      toast.error(`Failed to enable notifications: ${error.message}`);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      if (status !== "enabled") {
        throw new Error("Notifications are already disabled");
      }

      return setNotificationStatusMutation.mutate(false);
    },
    onSuccess() {
      toast.success("Notifications disabled");

      updateChannelInChannelQuery(channel.id, {
        notificationsEnabled: false,
      });
      updateChannelInMyChannelsQuery(channel.id, {
        notificationsEnabled: false,
      });
    },
    onError(error) {
      toast.error(`Failed to disable notifications: ${error.message}`);
    },
  });

  return useMemo(() => {
    return {
      status,
      enableMutation,
      disableMutation,
    };
  }, [status, enableMutation, disableMutation]);
}
