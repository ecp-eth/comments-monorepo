import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Comment as CommentType } from "@ecp.eth/shared/schemas";
import { getAddress } from "viem";
import { CommentActionOrStatus } from "./CommentActionOrStatus";
import { MoreVerticalIcon } from "lucide-react";
import { CommentAuthor } from "./CommentAuthor";
import { cn } from "@/lib/utils";
import { useAccount } from "wagmi";
import { CommentSwapInfo } from "./CommentSwapInfo";
import { useMemo } from "react";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import {
  CommentText,
  CommentMediaReferences,
  useConnectBeforeAction,
} from "@ecp.eth/shared/components";
import { publicEnv } from "@/publicEnv";
import Link from "next/link";
import { useReportCommentDialog } from "./ReportCommentDialogProvider";

type CommentProps = {
  comment: CommentType;
  onDeleteClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onEditClick: () => void;
  onRetryEditClick: () => void;
  isLiking?: boolean;
  optimisticReferences: IndexerAPICommentReferencesSchemaType | undefined;
};

export function Comment({
  comment,
  onDeleteClick,
  onRetryDeleteClick,
  onRetryPostClick,
  onEditClick,
  onRetryEditClick,
  isLiking,
  optimisticReferences,
}: CommentProps) {
  const { open } = useReportCommentDialog();
  const { address: connectedAddress } = useAccount();

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
      <div className="flex justify-between items-center">
        <CommentAuthor
          author={comment.author}
          moderationStatus={comment.moderationStatus}
          timestamp={comment.createdAt}
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
            <MoreVerticalIcon className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
                    className="text-red-600 cursor-pointer"
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
      {comment.zeroExSwap && (
        <div className="mb-2">
          <CommentSwapInfo swap={comment.zeroExSwap} />
        </div>
      )}
      <CommentText
        className={cn(
          "mb-2 break-words hyphens-auto text-foreground",
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
          isLiking={isLiking}
        />
      </div>
    </>
  );
}
