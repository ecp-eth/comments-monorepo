import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGaslessDeleteComment } from "@modprotocol/comments-protocol-sdk/wagmi";
import type { Hex } from "@modprotocol/comments-protocol-sdk/types";
import { formatDate } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import {
  performGaslessCommentDeletion,
  prepareCommentForGaslessDeletion,
} from "@/lib/operations";

interface CommentProps {
  id: Hex;
  content: string;
  author: string;
  timestamp: number;
  replies?: CommentProps[];
  onReply?: (parentId: string, content: string) => void;
  onDelete?: (id: Hex) => void;
}

export function CommentGasless({
  id,
  content,
  author,
  timestamp,
  replies,
  onReply,
  onDelete,
}: CommentProps) {
  const { address } = useAccount();

  const [isReplying, setIsReplying] = useState(false);
  const deleteCommentMutation = useGaslessDeleteComment({
    fetchSignedComment({ commentId }) {
      if (!address) {
        throw new Error("User is not signed in");
      }

      return prepareCommentForGaslessDeletion({
        author: address as Hex,
        commentId,
      });
    },
    deleteComment({ authorSignature, request }) {
      return performGaslessCommentDeletion({
        authorSignature,
        request,
      }).then((res) => res.txHash);
    },
  });

  const handleReply = (replyContent: string) => {
    onReply?.(id, replyContent);
    setIsReplying(false);
  };

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: deleteCommentMutation.data,
    });

  useEffect(() => {
    if (receipt?.status === "success") {
      onDelete?.(id);
    }
  }, [receipt]);

  const isAuthor = address ? getAddress(address) === getAddress(author) : false;

  const isDeleting = isReceiptLoading || deleteCommentMutation.isPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500 mb-1">
          {author} • {formatDate(timestamp)}
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
                  deleteCommentMutation.mutate({ commentId: id });
                }}
                disabled={isDeleting}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="mb-2">{content}</div>
      <div className="text-xs text-gray-500 mb-2">
        <button
          onClick={() => setIsReplying(!isReplying)}
          className="mr-2 hover:underline"
        >
          reply
        </button>
      </div>
      {isReplying && (
        <CommentBoxGasless
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={id}
        />
      )}
      {replies?.map((reply) => (
        <CommentGasless key={reply.id} {...reply} onReply={onReply} />
      ))}
    </div>
  );
}
