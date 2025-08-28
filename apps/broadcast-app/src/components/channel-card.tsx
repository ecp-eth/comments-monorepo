"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import type { Channel } from "@/api/schemas";
import { useSubscribeToChannel } from "@/hooks/useSubscribeToChannel";
import { cn, getChannelNftImageUrl } from "@/lib/utils";
import { ChannelCardNotificationsToggleButton } from "./channel-card-notifications-toggle-button";

interface ChannelCardProps {
  channel: Channel;
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const subscribeMutation = useSubscribeToChannel({
    channel,
  });

  const showSubscribeButton = !channel.isSubscribed;

  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Link
        href={`/channel/${channel.id}`}
        className="flex items-center space-x-3 flex-1 min-w-0"
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage
            src={getChannelNftImageUrl(channel.id, channel.chainId)}
            alt={channel.name}
          />
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
        <ChannelCardNotificationsToggleButton channel={channel} />

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
      </div>
    </div>
  );
}
