"use client";

import {
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useSubscribeToChannel } from "@/hooks/useSubscribeToChannel";
import { useUnsubscribeToChannel } from "@/hooks/useUnsubscribeFromChannel";
import { cn } from "@/lib/utils";
import { EditorComposer } from "@/components/editor-composer";
import { ChannelNotFoundError } from "@/errors";
import { useChannelQuery, useChannelCommentsQuery } from "@/queries/channel";
import { createChannelCommentsQueryKey } from "@/queries/query-keys";
import { VisibilityTracker } from "@/components/visibility-tracker";
import type { QueryKey } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";
import type { Channel } from "@/api/schemas";
import { useChannelNotificationsManager } from "@/hooks/useChannelNotificationsManager";
import { Hex } from "@ecp.eth/sdk/core";
import { EditCommentBottomSheet } from "@/components/edit-comment-bottom-sheet";
import { ReportBottomSheet } from "@/components/report-bottom-sheet";

export default function ChannelPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { address } = useAccount();
  const { connect, connectAsync, connectors } = useConnect();
  const chainId = useChainId();
  const { id: channelId } = z
    .object({
      id: z.coerce.bigint(),
    })
    .parse(use(props.params));
  const [replyingTo, setReplyingTo] = useState<{
    commentQueryKey: QueryKey;
    comment: Comment;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<{
    commentQueryKey: QueryKey;
    comment: Comment;
  } | null>(null);
  const [reportingComment, setReportingComment] = useState<Comment | null>(
    null,
  );

  const channelQuery = useChannelQuery(channelId);

  const commentsQueryKey = useMemo(
    () =>
      createChannelCommentsQueryKey({
        channelId,
        viewer: address,
      }),
    [channelId, address],
  );

  const commentsQuery = useChannelCommentsQuery({
    enabled: channelQuery.status === "success",
    channelId,
    author: address,
    chainId,
  });

  const [minimumContainerHeight, setMinimumContainerHeight] = useState(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    window.requestAnimationFrame(() => {
      const commentsContainer = window.document.querySelector(
        ".comments-container",
      );

      if (commentsContainer) {
        commentsContainer.scrollTo({
          top: commentsContainer.scrollHeight,
          behavior: "instant",
        });

        setMinimumContainerHeight(
          commentsContainer.getBoundingClientRect().height,
        );
      }
    });
  }, [commentsQuery.data]);

  // connect wallet if user is replying to a comment and not connected
  useEffect(() => {
    if (!address && replyingTo) {
      connectAsync({ connector: connectors[0] }).catch((e) => {
        console.error(e);

        setReplyingTo(null);
      });
    }
  }, [address, replyingTo, connectAsync, connectors]);

  const handleReply = useCallback(
    (comment: Comment, commentQueryKey: QueryKey) => {
      setReplyingTo({
        commentQueryKey,
        comment,
      });
    },
    [],
  );

  const handleEdit = useCallback(
    (comment: Comment, commentQueryKey: QueryKey) => {
      setEditingComment({
        commentQueryKey,
        comment,
      });
    },
    [],
  );

  const comments = useMemo(() => {
    return (
      commentsQuery.data?.pages.flatMap((page) => page.results) ?? []
    ).toReversed();
  }, [commentsQuery.data]);

  if (commentsQuery.status === "pending" || channelQuery.status === "pending") {
    return (
      <div className="h-screen max-w-[400px] mx-auto bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded animate-pulse mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-4 flex flex-col justify-end flex-grow">
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

          <ChannelDropdownMenu address={address} channel={channel} />
        </div>
      </div>

      <ScrollArea
        className="flex-1"
        viewportClassName="px-4 comments-container"
        ref={scrollAreaRef}
      >
        <div
          className="flex gap-4 flex-col justify-end"
          style={{ minHeight: minimumContainerHeight }}
        >
          <VisibilityTracker
            containerRef={scrollAreaRef}
            onVisibilityChange={(isVisible) => {
              if (
                isVisible &&
                !commentsQuery.isFetchingPreviousPage &&
                commentsQuery.hasPreviousPage
              ) {
                commentsQuery.fetchPreviousPage();
              }
            }}
          />

          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              threadComment={comment}
              onEdit={handleEdit}
              onReply={handleReply}
              onReport={setReportingComment}
            />
          ))}
        </div>
      </ScrollArea>

      {!isOwner && comments.length === 0 && (
        <div className="text-center text-muted-foreground p-4">
          No comments yet.
        </div>
      )}

      {isOwner && (
        <div className="px-4 pb-4">
          <EditorComposer queryKey={commentsQueryKey} channelId={channel.id} />
        </div>
      )}

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

      {address && replyingTo && (
        <ReplyBottomSheet
          channelId={channel.id}
          isOpen={!!replyingTo}
          onClose={() => setReplyingTo(null)}
          replyingTo={replyingTo.comment}
          replyingToQueryKey={replyingTo.commentQueryKey}
        />
      )}

      {address && editingComment && (
        <EditCommentBottomSheet
          comment={editingComment.comment}
          queryKey={editingComment.commentQueryKey}
          isOpen={!!editingComment}
          onClose={() => setEditingComment(null)}
        />
      )}

      {address && reportingComment && (
        <ReportBottomSheet
          comment={reportingComment}
          isOpen={!!reportingComment}
          onClose={() => setReportingComment(null)}
        />
      )}
    </div>
  );
}

type ChannelDropdownMenuProps = {
  address: Hex | undefined;
  channel: Channel;
};

function ChannelDropdownMenu({ address, channel }: ChannelDropdownMenuProps) {
  const { disconnect } = useDisconnect();
  const subscribeMutation = useSubscribeToChannel({
    channel,
  });
  const unsubscribeMutation = useUnsubscribeToChannel({
    channel,
  });
  const {
    status: notificationsStatus,
    enableMutation: enableNotificationsMutation,
    disableMutation: disableNotificationsMutation,
  } = useChannelNotificationsManager(channel);

  return (
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

        {notificationsStatus === "app-not-added" && (
          <DropdownMenuItem
            onClick={() => {
              enableNotificationsMutation.mutate();
            }}
          >
            <BellOffIcon className="h-4 w-4 mr-1" /> Enable notifications
          </DropdownMenuItem>
        )}

        {notificationsStatus === "app-disabled-notifications" && (
          <DropdownMenuItem
            disabled
            title="To manage notifications for this channel, you need to enable notifications in the mini app settings"
          >
            <BellOffIcon className="h-4 w-4 mr-1" /> App disabled notifications
          </DropdownMenuItem>
        )}

        {notificationsStatus === "enabled" && (
          <DropdownMenuItem
            onClick={() => {
              disableNotificationsMutation.mutate();
            }}
          >
            <BellOffIcon className="h-4 w-4 mr-1" /> Disable notifications
          </DropdownMenuItem>
        )}

        {notificationsStatus === "disabled" && (
          <DropdownMenuItem
            onClick={() => {
              enableNotificationsMutation.mutate();
            }}
          >
            <BellIcon className="h-4 w-4 mr-1" /> Enable notifications
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
                  <AvatarImage src={"/placeholder.svg"} alt={channel.name} />
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
  );
}
