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
import {
  type EmbedConfigProviderByTargetURIConfig,
  useEmbedConfig,
} from "../EmbedConfigProvider";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import { useMemo } from "react";
import {
  CommentText,
  CommentMediaReferences,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { publicEnv } from "@/publicEnv";
import Link from "next/link";
import { useReportCommentDialog } from "./ReportCommentDialogProvider";

export type OnRetryPostComment = (
  comment: CommentType,
  newPendingOperation: PendingCommentOperationSchemaType,
) => void;

interface CommentProps {
  comment: CommentType;
  onDeleteClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onEditClick: () => void;
  onRetryEditClick: () => void;
  isReactionPending?: (reactionType: string) => boolean;
  optimisticReferences: IndexerAPICommentReferencesSchemaType | undefined;
}

export function Comment({
  comment,
  onDeleteClick,
  onRetryDeleteClick,
  onRetryPostClick,
  onEditClick,
  onRetryEditClick,
  isReactionPending,
  optimisticReferences,
}: CommentProps) {
  const { currentTimestamp } =
    useEmbedConfig<EmbedConfigProviderByTargetURIConfig>();
  const { address: connectedAddress } = useAccount();
  const { open } = useReportCommentDialog();

  const connectBeforeAction = useConnectBeforeAction();

  const references = useMemo(() => {
    if (
      comment.references.length === 0 &&
      optimisticReferences &&
      optimisticReferences.length > 0
    ) {
      return optimisticReferences;
    }

    return comment.references;
  }, [comment.references, optimisticReferences]);

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="p-1 text-muted-foreground">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="apply-theme">
            {!comment.deletedAt &&
              comment.moderationStatus === "approved" &&
              (!comment.pendingOperation ||
                comment.pendingOperation.state.status === "success") && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={connectBeforeAction(() => {
                    open(comment);
                  })}
                >
                  Report
                </DropdownMenuItem>
              )}
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link
                href={publicEnv.NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL.replace(
                  "{txHash}",
                  comment.txHash,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on block explorer
              </Link>
            </DropdownMenuItem>
            {isAuthor &&
              !comment.deletedAt &&
              (!comment.pendingOperation ||
                comment.pendingOperation.state.status === "success") && (
                <>
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
                </>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CommentText
        className={cn(
          "mb-2 text-foreground break-words hyphens-auto",
          comment.deletedAt && "text-muted-foreground",
        )}
        content={comment.content}
        references={references}
      />
      <CommentMediaReferences
        content={comment.content}
        references={references}
      />
      <div className="mb-2">
        <CommentActionOrStatus
          comment={comment}
          onRetryDeleteClick={onRetryDeleteClick}
          onRetryPostClick={onRetryPostClick}
          onRetryEditClick={onRetryEditClick}
          isReactionPending={isReactionPending}
        />
      </div>
    </>
  );
}
