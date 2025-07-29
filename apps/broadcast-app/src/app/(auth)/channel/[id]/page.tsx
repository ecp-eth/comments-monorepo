"use client";

import { publicEnv } from "@/env/public";
import { fetchComments } from "@ecp.eth/sdk/indexer";
import sdk from "@farcaster/miniapp-sdk";
import { useQuery } from "@tanstack/react-query";
import { use, useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect } from "wagmi";
import z from "zod";
import {
  AlertTriangleIcon,
  BellIcon,
  BellOffIcon,
  InfoIcon,
  MoreVerticalIcon,
  PlusIcon,
  RotateCwIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CommentItem } from "@/components/comment-item";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReplyBottomSheet } from "@/components/reply-bottom-sheet";
import {
  AlreadySubscribedError,
  useSubscribeToChannel,
} from "@/hooks/useSubscribeToChannel";
import { toast } from "sonner";
import { useUnsubscribeToChannel } from "@/hooks/useUnsubscribeFromChannel";
import { useSetNotificationStatusOnChannel } from "@/hooks/useSetNotificationStatusOnChannel";
import type { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer";
import { cn } from "@/lib/utils";
import { EditorComposer } from "@/components/editor-composer";
import { ChannelSchema } from "@/api/schemas";
import { useScrollToBottom } from "@/hooks/useScrollToBottom";
import {
  createChannelCommentsQueryKey,
  createChannelQueryKey,
} from "@/queries";

class ChannelNotFoundError extends Error {
  constructor() {
    super("Channel not found");
    this.name = "ChannelNotFoundError";
  }
}

export default function ChannelPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { address } = useAccount();
  const { connect, connectAsync, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { id } = use(props.params);
  const [replyingTo, setReplyingTo] =
    useState<IndexerAPICommentSchemaType | null>(null);

  const subscribeMutation = useSubscribeToChannel({
    channelId: z.coerce.bigint().parse(id),
    onSuccess() {
      toast.success("Subscribed to channel");
    },
    onError(error) {
      if (error instanceof AlreadySubscribedError) {
        toast.error(`You are already subscribed to this channel`);
      } else {
        toast.error(`Failed to subscribe to channel: ${error.message}`);
        console.error("Error subscribing to channel:", error);
      }
    },
  });

  const unsubscribeMutation = useUnsubscribeToChannel({
    channelId: z.coerce.bigint().parse(id),
    onSuccess() {
      toast.success("Unsubscribed from channel");
    },
    onError() {
      toast.error("Failed to unsubscribe from channel");
    },
  });

  const setNotificationStatusMutation = useSetNotificationStatusOnChannel({
    channelId: z.coerce.bigint().parse(id),
    onSuccess() {
      toast.success("Notifications enabled for channel");
    },
    onError() {
      toast.error("Failed to enable notifications for channel");
    },
  });

  const channelQuery = useQuery({
    queryKey: createChannelQueryKey(z.coerce.bigint().parse(id)),
    queryFn: async () => {
      const channelId = z.coerce.bigint().parse(id);

      const channelUrl = new URL(
        `/api/channels/${channelId}`,
        publicEnv.NEXT_PUBLIC_BROADCAST_APP_INDEXER_URL,
      );
      const channelResponse = await sdk.quickAuth.fetch(channelUrl);

      if (channelResponse.status === 404) {
        throw new ChannelNotFoundError();
      }

      if (!channelResponse.ok) {
        throw new Error(
          `Failed to fetch channel: ${channelResponse.statusText}`,
        );
      }

      return ChannelSchema.parse(await channelResponse.json());
    },
  });

  const commentsQueryKey = createChannelCommentsQueryKey({
    channelId: z.coerce.bigint().parse(id),
    author: address,
  });

  const commentsQuery = useQuery({
    enabled: channelQuery.status === "success",
    queryKey: commentsQueryKey,
    queryFn: async () => {
      const channelId = z.coerce.bigint().parse(id);

      const response = await fetchComments({
        chainId,
        channelId,
        apiUrl: publicEnv.NEXT_PUBLIC_INDEXER_URL,
        mode: "flat",
        viewer: address,
        moderationStatus: ["approved", "pending"],
      });

      return {
        // use reversed order because we want to show the newest comments at the bottom
        results: response.results.toReversed(),
        pagination: response.pagination,
        extra: response.extra,
      };
    },
  });

  const scrollRef = useScrollToBottom([commentsQuery.data]);

  // connect wallet if user is replying to a comment and not connected
  useEffect(() => {
    if (!address && replyingTo) {
      connectAsync({ connector: connectors[0] }).catch((e) => {
        console.error(e);

        setReplyingTo(null);
      });
    }
  }, [address, replyingTo, connectAsync, connectors]);

  if (commentsQuery.status === "pending" || channelQuery.status === "pending") {
    return (
      <div className="h-screen max-w-[400px] mx-auto bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
                <div className="h-3 bg-muted rounded w-20 animate-pulse" />
              </div>
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (channelQuery.status === "error") {
    console.error("Error fetching channel:", channelQuery.error);
    const isNotFoundError = channelQuery.error instanceof ChannelNotFoundError;

    return (
      <div className="h-screen max-w-[400px] mx-auto bg-background flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangleIcon className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">
          {isNotFoundError
            ? "Channel not found."
            : "Oops, something went wrong."}
        </h2>
        {isNotFoundError ? (
          <Link href="/">
            <Button>Discover Channels</Button>
          </Link>
        ) : (
          <Button
            disabled={channelQuery.isRefetching}
            onClick={() => channelQuery.refetch()}
            className="gap-2"
          >
            <RotateCwIcon
              className={cn(
                "h-4 w-4",
                channelQuery.isRefetching && "animate-spin",
              )}
            />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (commentsQuery.status === "error") {
    return (
      <div className="h-screen max-w-[400px] mx-auto bg-background flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangleIcon className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-lg font-semibold mb-2">
          Oops, something went wrong.
        </h2>

        <Button
          disabled={commentsQuery.isRefetching}
          onClick={() => commentsQuery.refetch()}
          className="gap-2"
        >
          <RotateCwIcon
            className={cn(
              "h-4 w-4",
              commentsQuery.isRefetching && "animate-spin",
            )}
          />
          Retry
        </Button>
      </div>
    );
  }

  const channel = channelQuery.data;
  const comments = commentsQuery.data.results;
  const isOwner = address?.toLowerCase() === channel.owner.toLowerCase();

  return (
    <div className="h-screen max-w-[400px] mx-auto bg-background flex flex-col">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={"/placeholder.svg"} alt={channel.name} />
            <AvatarFallback>
              {channel.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{channel.name}</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (channel.isSubscribed) {
                    unsubscribeMutation.mutate();
                  } else {
                    subscribeMutation.mutate();
                  }
                }}
              >
                {channel.isSubscribed ? (
                  <>
                    <XIcon className="h-4 w-4 mr-1" /> Unsubscribe
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-1" /> Subscribe
                  </>
                )}
              </DropdownMenuItem>
              {channel.isSubscribed && (
                <DropdownMenuItem
                  onClick={() => {
                    if (channel.notificationsEnabled) {
                      setNotificationStatusMutation.mutate(false);
                    } else {
                      setNotificationStatusMutation.mutate(true);
                    }
                  }}
                >
                  {channel.notificationsEnabled ? (
                    <>
                      <BellOffIcon className="h-4 w-4 mr-1" />
                      Disable Notifications
                    </>
                  ) : (
                    <>
                      <BellIcon className="h-4 w-4 mr-1" />
                      Enable Notifications
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {address && (
                <DropdownMenuItem onClick={() => disconnect()}>
                  <WalletIcon className="h-4 w-4 mr-1" /> Disconnect wallet
                </DropdownMenuItem>
              )}
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <InfoIcon className="h-4 w-4 mr-1" /> Show Details
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="max-w-[350px]">
                  <DialogHeader>
                    <DialogTitle>Channel Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={"/placeholder.svg"}
                          alt={channel.name}
                        />
                        <AvatarFallback>
                          {channel.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{channel.name}</h3>
                      </div>
                    </div>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground">
                        {channel.description}
                      </p>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea
        className="flex-1"
        viewportClassName="flex flex-col justify-end"
      >
        <div ref={scrollRef} className="p-4 h-full flex flex-col justify-end">
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={setReplyingTo}
              />
            ))}

            {isOwner && (
              <EditorComposer
                queryKey={commentsQueryKey}
                channelId={channel.id}
              />
            )}

            {!isOwner && comments.length === 0 && (
              <div className="text-center text-muted-foreground">
                No comments yet.
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {!address && (
        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={() => connect({ connector: connectors[0] })}
          >
            <WalletIcon className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </div>
      )}

      {address && (
        <ReplyBottomSheet
          channelId={channel.id}
          isOpen={!!replyingTo}
          onClose={() => setReplyingTo(null)}
          originalComment={replyingTo}
          queryKey={commentsQueryKey}
        />
      )}
    </div>
  );
}
