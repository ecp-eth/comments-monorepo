import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress } from "viem";
import { signTypedData } from "viem/accounts";
import {
  useAccount,
  useSignTypedData,
  useWaitForTransactionReceipt,
} from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";

interface CommentProps {
  id: `0x${string}`;
  content: string;
  author: string;
  timestamp: number;
  replies?: CommentProps[];
  onReply?: (parentId: string, content: string) => void;
  onDelete?: (id: string) => void;
}

type DeleteCommentResponse =
  | {
      signTypedDataArgs: Parameters<typeof signTypedData>[0];
      appSignature: `0x${string}`;
    }
  | { txHash: `0x${string}` };

interface PostDeleteCommentRequest {
  signTypedDataArgs: Parameters<typeof signTypedData>[0];
  appSignature: `0x${string}`;
  authorSignature: `0x${string}`;
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
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}`>();

  const handleReply = (replyContent: string) => {
    onReply?.(id, replyContent);
    setIsReplying(false);
  };

  const { signTypedData: signApproval, isPending: isSigningApproval } =
    useSignTypedData();

  const postDeleteCommentMutation = useMutation({
    mutationFn: async (
      data: PostDeleteCommentRequest
    ): Promise<{ txHash: `0x${string}` }> => {
      const response = await fetch("/api/delete-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      return response.json();
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
    });

  const getDeleteCommentSignatureData = useMutation({
    mutationFn: async ({
      commentId,
      author,
      submitIfApproved = true,
    }: {
      commentId: string;
      author: string;
      submitIfApproved?: boolean;
    }): Promise<DeleteCommentResponse> => {
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
          author,
          commentId,
          submitIfApproved,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch approvals");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (receipt?.status === "success") {
      onDelete?.(id);
    }
  }, [receipt]);

  const isAuthor = address ? getAddress(address) === getAddress(author) : false;

  const isDeleting =
    isSigningApproval ||
    isReceiptLoading ||
    postDeleteCommentMutation.isPending ||
    getDeleteCommentSignatureData.isPending;

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
                  getDeleteCommentSignatureData.mutate(
                    {
                      commentId: id,
                      author,
                    },
                    {
                      onSuccess(commentSigData) {
                        if ("txHash" in commentSigData) {
                          setPendingTxHash(commentSigData.txHash);
                        } else {
                          signApproval(commentSigData.signTypedDataArgs, {
                            onSuccess(authorSigData, variables, context) {
                              postDeleteCommentMutation.mutate(
                                {
                                  signTypedDataArgs:
                                    commentSigData.signTypedDataArgs,
                                  appSignature: commentSigData.appSignature,
                                  authorSignature: authorSigData,
                                },
                                {
                                  onSuccess(data, variables, context) {
                                    setPendingTxHash(data.txHash);
                                  },
                                }
                              );
                            },
                          });
                        }
                      },
                    }
                  );
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
