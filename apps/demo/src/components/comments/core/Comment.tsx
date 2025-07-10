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
} from "@ecp.eth/shared/components";

type CommentProps = {
  comment: CommentType;
  onDeleteClick: () => void;
  onReplyClick: () => void;
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
  onReplyClick,
  onEditClick,
  onRetryEditClick,
  isLiking,
  optimisticReferences,
}: CommentProps) {
  const { address: connectedAddress } = useAccount();
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
        {isAuthor &&
          !comment.deletedAt &&
          (!comment.pendingOperation ||
            comment.pendingOperation.state.status === "success") && (
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
                <MoreVerticalIcon className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
          onReplyClick={onReplyClick}
          onRetryPostClick={onRetryPostClick}
          onRetryEditClick={onRetryEditClick}
          isLiking={isLiking}
        />
      </div>
    </>
  );
}
