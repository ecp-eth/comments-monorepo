import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { APIComment } from "@/lib/types";

interface CommentProps {
  comment: APIComment;
  onReply?: (parentId: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentGasless({ comment, onReply, onDelete }: CommentProps) {
  const { address } = useAccount();

  const [isReplying, setIsReplying] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();

  const handleReply = (replyContent: string) => {
    onReply?.(comment.id, replyContent);
    setIsReplying(false);
  };

  const gaslessMutation = useGaslessTransaction({
    async prepareSignTypedData() {
      setPendingTxHash(undefined);

      if (!address) {
        throw new Error("No address found");
      }

      const response = await fetch(`/api/delete-comment/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          author: comment.author,
          commentId: comment.id,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }

      const data = await response.json();

      return {
        signTypedDataArgs: data.signTypedDataArgs,
        variables: data,
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/delete-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...variables,
          authorSignature: signature,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      const data = await response.json();

      return data.txHash;
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
    });

  useEffect(() => {
    if (receipt?.status === "success") {
      onDelete?.(comment.id);
    }
  }, [receipt]);

  const isAuthor = address
    ? getAddress(address) === getAddress(comment.author)
    : false;

  const isDeleting = gaslessMutation.isPending || isReceiptLoading;

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
                  gaslessMutation.mutate(void 0, {
                    onSuccess(hash) {
                      setPendingTxHash(hash);
                    },
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
        <CommentBoxGasless
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
      {comment.replies.results?.map((reply) => (
        <CommentGasless key={reply.id} comment={reply} onReply={onReply} />
      ))}
    </div>
  );
}
