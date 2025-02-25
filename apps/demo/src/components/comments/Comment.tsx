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
import { useFreshRef } from "@/lib/hooks";

interface CommentProps {
  comment: CommentType;
  onReply?: (parentId: string) => void;
  onDelete?: (id: string) => void;
}

export function Comment({ comment, onReply, onDelete }: CommentProps) {
  const onDeleteRef = useFreshRef(onDelete);
  const { address: connectedAddress } = useAccount();

  const [isReplying, setIsReplying] = useState(false);

  const handleReply = () => {
    onReply?.(comment.id);
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

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const isDeleting = isDeleteSigPending || isDeleteTxPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <CommentAuthorAvatar author={comment.author} />
          <div className="text-xs text-gray-500">
            {getCommentAuthorNameOrAddress(comment.author)} •{" "}
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
        <CommentBox
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={comment.id}
        />
      )}
      {"replies" in comment &&
        comment.replies.results?.map((reply) => (
          <Comment key={reply.id} comment={reply} onReply={onReply} />
        ))}
    </div>
  );
}
