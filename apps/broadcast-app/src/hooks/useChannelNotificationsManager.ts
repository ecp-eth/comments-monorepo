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
  | "app-disabled-notifications"
  | "not-in-mini-app";

type ChannelManagerAPI = {
  status: Status;
  enableMutation: UseMutationResult<{ clientFid: number }, Error, void>;
  disableMutation: UseMutationResult<{ clientFid: number }, Error, void>;
};

export function useChannelNotificationsManager(
  channel: Channel,
): ChannelManagerAPI {
  const updateChannelInChannelQuery = useUpdateChannelInChannelQuery();
  const updateChannelInMyChannelsQuery = useUpdateChannelInMyChannelsQuery();
  const miniAppContext = useMiniAppContext();
  const setNotificationStatusMutation = useSetNotificationStatusOnChannel({
    channelId: channel.id,
    miniAppContext,
  });

  const isAppAdded = miniAppContext.isInMiniApp && miniAppContext.client.added;
  const doesAppHaveNotificationsEnabled =
    miniAppContext.isInMiniApp && !!miniAppContext.client.notificationDetails;
  const hasChannelNotificationsEnabled =
    miniAppContext.isInMiniApp &&
    channel.notificationSettings[miniAppContext.client.clientFid];

  let status: Status;

  if (!miniAppContext.isInMiniApp) {
    status = "not-in-mini-app";
  } else if (!channel.isSubscribed) {
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

      if (!miniAppContext.isInMiniApp) {
        throw new Error("Not in mini app");
      }

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

      await setNotificationStatusMutation.mutateAsync(true);

      return {
        clientFid: miniAppContext.client.clientFid,
      };
    },
    onSuccess({ clientFid }) {
      toast.success("Notifications enabled");

      updateChannelInChannelQuery(channel.id, {
        notificationSettings: {
          ...channel.notificationSettings,
          [clientFid]: true,
        },
      });
      updateChannelInMyChannelsQuery(channel.id, {
        notificationSettings: {
          ...channel.notificationSettings,
          [clientFid]: true,
        },
      });
    },
    onError(error) {
      toast.error(`Failed to enable notifications: ${error.message}`);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!miniAppContext.isInMiniApp) {
        throw new Error("Not in mini app");
      }

      if (status !== "enabled") {
        throw new Error("Notifications are already disabled");
      }

      await setNotificationStatusMutation.mutateAsync(false);

      return {
        clientFid: miniAppContext.client.clientFid,
      };
    },
    onSuccess({ clientFid }) {
      toast.success("Notifications disabled");

      updateChannelInChannelQuery(channel.id, {
        notificationSettings: {
          ...channel.notificationSettings,
          [clientFid]: false,
        },
      });
      updateChannelInMyChannelsQuery(channel.id, {
        notificationSettings: {
          ...channel.notificationSettings,
          [clientFid]: false,
        },
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
