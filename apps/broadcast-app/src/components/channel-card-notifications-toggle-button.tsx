import type { Channel } from "@/api/schemas";
import { useChannelNotificationsManager } from "@/hooks/useChannelNotificationsManager";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { BellIcon, BellOffIcon } from "lucide-react";

export function ChannelCardNotificationsToggleButton({
  channel,
}: {
  channel: Channel;
}) {
  const channelNotificationsManager = useChannelNotificationsManager(channel);
  const {
    status: notificationsStatus,
    enableMutation: enableNotificationsMutation,
    disableMutation: disableNotificationsMutation,
  } = channelNotificationsManager;

  if (notificationsStatus === "app-not-added") {
    return (
      <Button
        disabled={enableNotificationsMutation.isPending}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="To manage notifications for this channel, you need to add the mini app"
        onClick={() => enableNotificationsMutation.mutate()}
      >
        <BellOffIcon
          className={cn(
            "h-4 w-4",
            enableNotificationsMutation.isPending && "animate-pulse",
          )}
        />
      </Button>
    );
  }

  if (notificationsStatus === "app-disabled-notifications") {
    return (
      <Button
        disabled
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        title="To manage notifications for this channel, you need to enable notifications in the mini app settings"
      >
        <BellOffIcon className={cn("h-4 w-4")} />
      </Button>
    );
  }

  if (notificationsStatus === "enabled") {
    return (
      <Button
        disabled={disableNotificationsMutation.isPending}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => disableNotificationsMutation.mutate()}
        title="Disable notifications for this channel"
      >
        <BellIcon
          className={cn(
            "h-4 w-4",
            disableNotificationsMutation.isPending && "animate-pulse",
          )}
        />
      </Button>
    );
  }

  if (notificationsStatus === "disabled") {
    return (
      <Button
        disabled={enableNotificationsMutation.isPending}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => enableNotificationsMutation.mutate()}
        title="Enable notifications for this channel"
      >
        <BellOffIcon
          className={cn(
            "h-4 w-4",
            enableNotificationsMutation.isPending && "animate-pulse",
          )}
        />
      </Button>
    );
  }

  return null;
}
