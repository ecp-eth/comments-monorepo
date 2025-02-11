"use client";

import { useCallback, useEffect, useState } from "react";
import { CommentForm } from "./CommentForm";
import { formatDate } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { getAddress } from "viem";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import type { Comment as CommentType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { useFreshRef } from "@/hooks/useFreshRef";

interface CommentProps {
  comment: CommentType;
  onDelete?: (id: Hex) => void;
}

export function Comment({ comment, onDelete }: CommentProps) {
  const onDeleteRef = useFreshRef(onDelete);
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);

  const handleSubmitSuccess = useCallback(() => {
    setIsReplying(false);
  }, []);

  const deleteCommentContract = useWriteContract();

  const deleteCommentTransactionReceipt = useWaitForTransactionReceipt({
    hash: deleteCommentContract.data,
  });

  useEffect(() => {
    if (deleteCommentTransactionReceipt.data?.status === "success") {
      onDeleteRef.current?.(comment.id);
    }
  }, [deleteCommentTransactionReceipt.data?.status, comment, onDeleteRef]);

  const isAuthor = connectedAddress
    ? getAddress(connectedAddress) === getAddress(comment.author)
    : false;

  const isDeleting =
    deleteCommentTransactionReceipt.isFetching ||
    deleteCommentContract.isPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 mb-1">
          {comment.author} • {formatDate(comment.timestamp)}
        </div>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600 cursor-pointer"
                onClick={() => {
                  deleteCommentContract.writeContract({
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
      <div className="mb-2">{comment.content}</div>
      <div className="text-xs text-gray-500 mb-2">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="mr-2 hover:underline"
        >
          reply
        </button>
      </div>
      {isReplying && (
        <CommentForm
          onSubmitSuccess={handleSubmitSuccess}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
      {comment.replies.results?.map((reply) => (
        <Comment key={reply.id} comment={reply} onDelete={onDelete} />
      ))}
    </div>
  );
}
