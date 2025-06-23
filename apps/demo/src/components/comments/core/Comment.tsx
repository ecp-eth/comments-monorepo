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
import { renderToReact } from "./renderer";
import { CommentMediaReference } from "./CommentMediaReference";
import type { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer/schemas";

type CommentProps = {
  comment: CommentType;
  onDeleteClick: () => void;
  onReplyClick: () => void;
  onRetryDeleteClick: () => void;
  onRetryPostClick: () => void;
  onEditClick: () => void;
  onRetryEditClick: () => void;
  onLikeClick: () => void;
  onUnlikeClick: () => void;
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
  onLikeClick,
  onUnlikeClick,
  isLiking,
  optimisticReferences,
}: CommentProps) {
  const { address: connectedAddress } = useAccount();
  const { element: textElement, mediaReferences } = useMemo(() => {
    let commentWithReferences = comment;

    if (
      comment.references.length === 0 &&
      optimisticReferences &&
      optimisticReferences.length > 0
    ) {
      commentWithReferences = {
        ...comment,
        references: optimisticReferences,
      };
    }

    return renderToReact(commentWithReferences);
  }, [comment, optimisticReferences]);

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
      <div
        className={cn(
          "mb-2 break-words hyphens-auto text-foreground",
          comment.deletedAt && "text-muted-foreground",
        )}
      >
        <div>{textElement}</div>
      </div>
      {mediaReferences.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {mediaReferences.map((reference, referenceIndex) => {
            return (
              <CommentMediaReference
                reference={reference}
                key={referenceIndex}
              />
            );
          })}
        </div>
      )}
      <div className="mb-2">
        <CommentActionOrStatus
          comment={comment}
          hasAccountConnected={!!connectedAddress}
          onRetryDeleteClick={onRetryDeleteClick}
          onReplyClick={onReplyClick}
          onRetryPostClick={onRetryPostClick}
          onRetryEditClick={onRetryEditClick}
          onLikeClick={onLikeClick}
          onUnlikeClick={onUnlikeClick}
          isLiking={isLiking}
        />
      </div>
    </>
  );
}
