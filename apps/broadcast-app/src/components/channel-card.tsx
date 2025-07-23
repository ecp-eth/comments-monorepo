"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon, BellIcon, BellOffIcon } from "lucide-react";
import type { Channel } from "@/app/types";
import {
  AlreadySubscribedError,
  useSubscribeToChannel,
} from "@/hooks/useSubscribeToChannel";
import { toast } from "sonner";
import { useUnsubscribeToChannel } from "@/hooks/useUnsubscribeFromChannel";
import { useSetNotificationStatusOnChannel } from "@/hooks/useSetNotificationStatusOnChannel";
import { useMiniAppContext } from "@/hooks/useMiniAppContext";
import { useMutation } from "@tanstack/react-query";
import sdk from "@farcaster/miniapp-sdk";
import { cn } from "@/lib/utils";

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const miniAppContext = useMiniAppContext();
  const subscribeMutation = useSubscribeToChannel({
    channelId: channel.id,
    onSuccess() {
      toast.success(`Subscribed to channel ${channel.name}`);

      // @todo remove channel from the discover list
    },
    onError(error) {
      if (error instanceof AlreadySubscribedError) {
        toast.error(`You are already subscribed to channel ${channel.name}`);
      } else {
        toast.error(`Failed to subscribe to channel: ${error.message}`);
        console.error("Error subscribing to channel:", error);
      }
    },
  });
  const unsubscribeMutation = useUnsubscribeToChannel({
    channelId: channel.id,
    onError() {
      toast.error(`Failed to unsubscribe from channel ${channel.name}`);
    },
    onSuccess() {
      toast.success(`Unsubscribed from channel ${channel.name}`);

      // @todo remove channel from the list
    },
  });
  const setNotificationStatusMutation = useSetNotificationStatusOnChannel({
    channelId: channel.id,
    onError(error, variables) {
      if (variables === true) {
        toast.error("Failed to enable notifications");
      } else {
        toast.error("Failed to disable notifications");
      }
    },
    onSuccess(data, variables) {
      if (variables === true) {
        toast.success(`Notifications enabled for channel ${channel.name}`);
      } else {
        toast.success(`Notifications disabled for channel ${channel.name}`);
      }
    },
  });
  const addMiniAppMutation = useMutation({
    mutationFn: async () => {
      let notificationDetails = miniAppContext.client.notificationDetails;

      if (!miniAppContext.client.added) {
        const result = await sdk.actions.addMiniApp();

        notificationDetails = result.notificationDetails;
      }

      return setNotificationStatusMutation.mutate(
        // only if notifications are enabled in farcaster the notifications per channel can be enabled
        !!notificationDetails && !channel.notificationsEnabled,
      );
    },
    onSuccess() {
      toast.success(`Notifications toggled for channel ${channel.name}`);
    },
    onError() {
      toast.error(`Failed to toggle notifications for channel ${channel.name}`);
    },
  });
  const canUseNotifications =
    miniAppContext.client.added && !!miniAppContext.client.notificationDetails;
  const needsToAddMiniApp =
    !miniAppContext.client.added && channel.isSubscribed;
  const canManageNotifications = channel.isSubscribed && canUseNotifications;
  const showSubscribeButton = !channel.isSubscribed;
  const showUnsubscribeButton = channel.isSubscribed;

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Link
        href={`/channel/${channel.id}`}
        className="flex items-center space-x-3 flex-1 min-w-0"
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src="/placeholder.svg" alt={channel.name} />
          <AvatarFallback>
            {channel.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{channel.name}</h3>
          {channel.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {channel.description}
            </p>
          )}
        </div>
      </Link>

      <div className="flex items-center space-x-2 shrink-0">
        {needsToAddMiniApp && (
          <Button
            disabled={addMiniAppMutation.isPending}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Notifications are not enabled for this app"
            onClick={() => addMiniAppMutation.mutate()}
          >
            <BellOffIcon className="h-4 w-4" />
          </Button>
        )}

        {canManageNotifications && (
          <Button
            disabled={setNotificationStatusMutation.isPending}
            variant="ghost"
            size="sm"
            onClick={() =>
              setNotificationStatusMutation.mutate(
                !channel.notificationsEnabled,
              )
            }
            className="h-8 w-8 p-0"
          >
            {channel.notificationsEnabled ? (
              <BellIcon className="h-4 w-4" />
            ) : (
              <BellOffIcon className="h-4 w-4" />
            )}
          </Button>
        )}

        {showSubscribeButton && (
          <Button
            disabled={subscribeMutation.isPending}
            size="sm"
            onClick={() => subscribeMutation.mutate()}
            className={cn(
              "text-xs",
              subscribeMutation.isPending && "animate-pulse",
            )}
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Subscribe
          </Button>
        )}

        {showUnsubscribeButton && (
          <Button
            disabled={unsubscribeMutation.isPending}
            variant="outline"
            size="sm"
            onClick={() => unsubscribeMutation.mutate()}
            className={cn(
              "text-xs bg-transparent",
              unsubscribeMutation.isPending && "animate-pulse",
            )}
          >
            <XIcon className="h-3 w-3 mr-1" />
            Unsubscribe
          </Button>
        )}
      </div>
    </div>
  );
}
