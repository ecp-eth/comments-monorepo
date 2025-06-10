"use client";

import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount } from "wagmi";
import { getAddress } from "viem";
import {
  type Comment as CommentType,
  type PendingCommentOperationSchemaType,
} from "@ecp.eth/shared/schemas";
import { Button } from "../ui/button";
import { CommentAuthor } from "./CommentAuthor";
import { CommentActionOrStatus } from "./CommentActionOrStatus";
import { CommentText } from "@ecp.eth/shared/components";
import {
  EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";

export type OnRetryPostComment = (
  comment: CommentType,
  newPendingOperation: PendingCommentOperationSchemaType,
) => void;

interface CommentProps {
  comment: CommentType;
  onDeleteClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onReplyClick: () => void;
  onEditClick: () => void;
  onRetryEditClick: () => void;
}

export function Comment({
  comment,
  onDeleteClick,
  onRetryDeleteClick,
  onRetryPostClick,
  onReplyClick,
  onEditClick,
  onRetryEditClick,
}: CommentProps) {
  const { currentTimestamp } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const { address: connectedAddress } = useAccount();

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const isDeleting =
    comment.pendingOperation?.action === "delete" &&
    comment.pendingOperation.state.status === "pending";

  const isEditing =
    comment.pendingOperation?.action === "edit" &&
    comment.pendingOperation.state.status === "pending";

  return (
    <>
      <div className="flex justify-between items-center mb-2">
        <CommentAuthor
          author={comment.author}
          timestamp={comment.createdAt}
          currentTimestamp={currentTimestamp}
          moderationStatus={comment.moderationStatus}
        />
        {isAuthor &&
          !comment.deletedAt &&
          (!comment.pendingOperation ||
            comment.pendingOperation.state.status === "success") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-1 text-muted-foreground">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="apply-theme">
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onEditClick}
                  disabled={isEditing}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={onDeleteClick}
                  disabled={isDeleting}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
      </div>
      <div
        className={cn(
          "mb-2 text-foreground break-words hyphens-auto",
          comment.deletedAt && "text-muted-foreground",
        )}
      >
        <CommentText
          // make sure comment is updated if was deleted
          key={`${comment.deletedAt?.toISOString()}-${comment.updatedAt}-${comment.revision}`}
          text={comment.content}
        />
      </div>
      <div className="mb-2">
        <CommentActionOrStatus
          comment={comment}
          hasAccountConnected={!!connectedAddress}
          onRetryDeleteClick={onRetryDeleteClick}
          onReplyClick={onReplyClick}
          onRetryPostClick={onRetryPostClick}
          onRetryEditClick={onRetryEditClick}
        />
      </div>
    </>
  );
}
