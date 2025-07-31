"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon, BellIcon, BellOffIcon } from "lucide-react";
import type { Channel } from "@/api/schemas";
import { useSubscribeToChannel } from "@/hooks/useSubscribeToChannel";
import { useUnsubscribeToChannel } from "@/hooks/useUnsubscribeFromChannel";
import { cn } from "@/lib/utils";
import { useChannelNotificationsManager } from "@/hooks/useChannelNotificationsManager";

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const subscribeMutation = useSubscribeToChannel({
    channel,
  });
  const unsubscribeMutation = useUnsubscribeToChannel({
    channel,
  });
  const channelNotificationsManager = useChannelNotificationsManager(channel);
  const {
    status: notificationsStatus,
    enableMutation: enableNotificationsMutation,
    disableMutation: disableNotificationsMutation,
  } = channelNotificationsManager;

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
        {notificationsStatus === "app-not-added" && (
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
        )}

        {notificationsStatus === "app-disabled-notifications" && (
          <Button
            disabled
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="To manage notifications for this channel, you need to enable notifications in the mini app settings"
          >
            <BellOffIcon className={cn("h-4 w-4")} />
          </Button>
        )}

        {notificationsStatus === "enabled" && (
          <Button
            disabled={disableNotificationsMutation.isPending}
            variant="ghost"
            size="sm"
            onClick={() => disableNotificationsMutation.mutate()}
            className="h-8 w-8 p-0"
            title="Disable notifications for this channel"
          >
            <BellIcon
              className={cn(
                "h-4 w-4",
                disableNotificationsMutation.isPending && "animate-pulse",
              )}
            />
          </Button>
        )}

        {notificationsStatus === "disabled" && (
          <Button
            disabled={enableNotificationsMutation.isPending}
            variant="ghost"
            size="sm"
            onClick={() => enableNotificationsMutation.mutate()}
            className="h-8 w-8 p-0"
            title="Enable notifications for this channel"
          >
            <BellOffIcon
              className={cn(
                "h-4 w-4",
                enableNotificationsMutation.isPending && "animate-pulse",
              )}
            />
          </Button>
        )}

        {showSubscribeButton && (
          <Button
            disabled={subscribeMutation.isPending}
            size="sm"
            onClick={() => subscribeMutation.mutate()}
            className="text-xs"
          >
            <PlusIcon
              className={cn(
                "h-3 w-3",
                subscribeMutation.isPending && "animate-pulse",
              )}
            />
            Subscribe
          </Button>
        )}

        {showUnsubscribeButton && (
          <Button
            disabled={unsubscribeMutation.isPending}
            variant="outline"
            size="sm"
            onClick={() => unsubscribeMutation.mutate()}
            className="text-xs bg-transparent"
          >
            <XIcon
              className={cn(
                "h-3 w-3",
                unsubscribeMutation.isPending && "animate-pulse",
              )}
            />
          </Button>
        )}
      </div>
    </div>
  );
}
