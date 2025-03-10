import { Hex } from "@ecp.eth/sdk/schemas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentBox } from "./CommentBox";
import { CommentAuthorAvatar } from "./CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "./helpers";
import type { CommentType } from "@/lib/types";
import { useFreshRef } from "@/hooks/useFreshRef";
import { PendingCommentOperationSchemaType } from "@/lib/schemas";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import { publicEnv } from "@/publicEnv";
import { renderCommentContent } from "@/lib/renderer";

interface CommentProps {
  comment: CommentType;
  onReply?: (
    pendingCommentOperation: PendingCommentOperationSchemaType
  ) => void;
  onDelete?: (id: Hex) => void;
  level?: number;
}

export function Comment({
  comment,
  onReply,
  onDelete,
  level = 0,
}: CommentProps) {
  const onDeleteRef = useFreshRef(onDelete);
  const { address: connectedAddress } = useAccount();
  const enrichedAuthor = useEnrichedAuthor(comment.author);
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = (
    pendingCommentOperation: PendingCommentOperationSchemaType
  ) => {
    onReply?.(pendingCommentOperation);
    setIsReplying(false);
  };

  const {
    data: deleteTxHash,
    writeContract,
    isPending: isDeleteSigPending,
  } = useWriteContract();
  const { data: deleteTxReceipt, isFetching: isDeleteTxPending } =
    useWaitForTransactionReceipt({
      hash: deleteTxHash,
      confirmations: 1,
    });

  useEffect(() => {
    if (deleteTxReceipt?.status === "success") {
      onDeleteRef.current?.(comment.id);
    }
  }, [comment.id, deleteTxReceipt?.status, onDeleteRef]);

  const isAuthor = connectedAddress
    ? getAddress(connectedAddress) === getAddress(enrichedAuthor.address)
    : false;

  const isDeleting = isDeleteSigPending || isDeleteTxPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CommentAuthorAvatar author={enrichedAuthor} />
          <div className="text-xs text-gray-500">
            {getCommentAuthorNameOrAddress(enrichedAuthor)} •{" "}
            {formatDate(comment.timestamp)}
          </div>
        </div>
        {isAuthor && !comment.deletedAt && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => {
                  writeContract({
                    address: COMMENTS_V1_ADDRESS,
                    abi: CommentsV1Abi,
                    functionName: "deleteCommentAsAuthor",
                    args: [comment.id],
                  });
                }}
                disabled={isDeleting}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mb-2">{renderCommentContent(comment.content)}</div>
      <div className="text-xs text-gray-500 mb-2">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="mr-2 hover:underline"
        >
          reply
        </button>
      </div>
      {isReplying && (
        <CommentBox
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={
            level >= publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF &&
            comment.parentId
              ? comment.parentId
              : comment.id
          }
        />
      )}
      {"replies" in comment &&
        comment.replies.results?.map((reply) => (
          <Comment
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onDelete={onDelete}
            level={level + 1}
          />
        ))}
    </div>
  );
}
