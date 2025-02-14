import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { APIComment } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { blo } from "blo";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { CommentBox } from "./CommentBox";

interface CommentProps {
  comment: APIComment;
  onReply?: (parentId: string, content: string) => void;
  onDelete?: (id: string) => void;
}

export function Comment({ comment, onReply, onDelete }: CommentProps) {
  const { address: connectedAddress } = useAccount();

  const [isReplying, setIsReplying] = useState(false);

  const handleReply = (replyContent: string) => {
    onReply?.(comment.id, replyContent);
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
      onDelete?.(comment.id);
    }
  }, [deleteTxReceipt]);

  const isAuthor =
    connectedAddress && comment.author
      ? getAddress(connectedAddress) === getAddress(comment.author.address)
      : false;

  const isDeleting = isDeleteSigPending || isDeleteTxPending;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Avatar className="h-4 w-4">
            {comment.author?.ens?.avatarUrl ? (
              <AvatarImage
                src={comment.author?.ens?.avatarUrl ?? undefined}
                alt="ENS Avatar"
              />
            ) : comment.author ? (
              <AvatarImage
                src={blo(comment.author?.address)}
                alt="Generated Avatar"
              />
            ) : null}
            <AvatarFallback>
              {comment.author?.ens?.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs text-gray-500">
            {comment.author?.ens?.name ??
              comment.author?.address ??
              "Unknown sender"}{" "}
            • {formatDate(comment.timestamp)}
          </div>
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
      {comment.replies.results?.map((reply) => (
        <Comment key={reply.id} comment={reply} onReply={onReply} />
      ))}
    </div>
  );
}
