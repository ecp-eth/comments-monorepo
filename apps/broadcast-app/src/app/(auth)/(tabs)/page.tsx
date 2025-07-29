"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "@/components/channel-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useDiscoverChannelsQuery } from "@/queries/discover-channels";

export default function DiscoverChannelsPage() {
  const { data, error, status, isRefetching, refetch } =
    useDiscoverChannelsQuery();

  if (error) {
    console.error("Error fetching channels:", error);
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangleIcon className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">
          Oops, something went wrong.
        </h2>
        <Button
          disabled={isRefetching}
          onClick={() => refetch()}
          variant="outline"
          className="gap-2"
        >
          <RotateCwIcon
            className={cn("h-4 w-4", isRefetching && "animate-spin")}
          />
          Retry
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="h-full p-4">
        <h1 className="text-2xl font-bold mb-6">Discover Channels</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center space-x-3 p-3 rounded-lg border"
            >
              <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
              <div className="w-20 h-8 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-lg font-semibold mb-2">No channels available.</h2>
        <p className="text-muted-foreground mb-4">Check again later.</p>
        <Button
          disabled={isRefetching}
          onClick={() => refetch()}
          variant="outline"
          className="gap-2"
        >
          <RotateCwIcon
            className={cn("h-4 w-4", isRefetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold">Discover Channels</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {data.results.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
