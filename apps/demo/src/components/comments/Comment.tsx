import { useEffect, useState } from "react";
import { CommentBox } from "./CommentBox";
import { formatDate } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useDeleteCommentAsAuthor } from "@ecp.eth/sdk/wagmi";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { getAddress } from "viem";

interface CommentProps {
  id: Hex;
  content: string;
  author: string;
  timestamp: number;
  replies?: CommentProps[];
  onReply?: (parentId: Hex, content: string) => void;
  onDelete?: (id: Hex) => void;
}

export function Comment({
  id,
  content,
  author,
  timestamp,
  replies,
  onReply,
  onDelete,
}: CommentProps) {
  const { address: connectedAddress } = useAccount();
  const deleteCommentMutation = useDeleteCommentAsAuthor();

  const [isReplying, setIsReplying] = useState(false);

  const handleReply = (replyContent: string) => {
    onReply?.(id, replyContent);
    setIsReplying(false);
  };

  const { data: deleteTxReceipt, isFetching: isDeleteTxPending } =
    useWaitForTransactionReceipt({
      hash: deleteCommentMutation.data,
      confirmations: 1,
    });

  useEffect(() => {
    if (deleteTxReceipt?.status === "success") {
      onDelete?.(id);
    }
  }, [deleteTxReceipt, onDelete, id]);

  const isAuthor = connectedAddress
    ? getAddress(connectedAddress) === getAddress(author)
    : false;

  const isDeleting = deleteCommentMutation.isPending || isDeleteTxPending;

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
                  deleteCommentMutation.mutate(id);
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
        <CommentBox
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={id}
        />
      )}
      {replies?.map((reply) => (
        <Comment key={reply.id} {...reply} onReply={onReply} />
      ))}
    </div>
  );
}
