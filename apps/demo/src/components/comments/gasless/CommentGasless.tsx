import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/utils";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { MoreVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAddress, SignTypedDataParameters } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import { CommentAuthorAvatar } from "../CommentAuthorAvatar";
import { getCommentAuthorNameOrAddress } from "../helpers";
import type { CommentType } from "@/lib/types";
import { useFreshRef } from "@/lib/hooks";
import {
  PreparedGaslessCommentOperationApprovedSchema,
  PreparedGaslessCommentOperationSchema,
  PreparedGaslessCommentOperationSchemaType,
  PreparedSignedGaslessCommentOperationNotApprovedSchema,
  type PreparedSignedGaslessCommentOperationNotApprovedSchemaType,
  type PrepareGaslessCommentDeletionRequestBodySchemaType,
} from "@/lib/schemas";
import { useMutation } from "@tanstack/react-query";

async function gaslessDeleteComment(
  params: PrepareGaslessCommentDeletionRequestBodySchemaType
): Promise<PreparedGaslessCommentOperationSchemaType> {
  const response = await fetch(`/api/delete-comment/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error("Failed to delete comment");
  }

  return PreparedGaslessCommentOperationSchema.parse(await response.json());
}

interface CommentProps {
  submitIfApproved: boolean;
  comment: CommentType;
  onReply?: (parentId: string) => void;
  onDelete?: (id: string) => void;
}

export function CommentGasless({
  comment,
  onReply,
  onDelete,
  submitIfApproved,
}: CommentProps) {
  const { address } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const onDeleteRef = useFreshRef(onDelete);

  const handleReply = () => {
    onReply?.(comment.id);
    setIsReplying(false);
  };

  const deleteCommentUsingApprovalMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("No address found");
      }

      if (!submitIfApproved) {
        throw new Error("Not approved");
      }

      const result = await gaslessDeleteComment({
        author: address,
        commentId: comment.id,
        submitIfApproved: true,
      });

      return PreparedGaslessCommentOperationApprovedSchema.parse(result).txHash;
    },
  });

  const gaslessDeleteCommentMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!address) {
        throw new Error("No address found");
      }

      const result = await gaslessDeleteComment({
        author: address,
        commentId: comment.id,
        submitIfApproved: false,
      });

      const data =
        PreparedSignedGaslessCommentOperationNotApprovedSchema.parse(result);

      return {
        signTypedDataParams: data.signTypedDataParams,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessCommentOperationNotApprovedSchemaType;
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

  const handleDeleteComment = useCallback(() => {
    if (submitIfApproved) {
      deleteCommentUsingApprovalMutation.mutate();
    } else {
      gaslessDeleteCommentMutation.mutate();
    }
  }, [
    submitIfApproved,
    deleteCommentUsingApprovalMutation,
    gaslessDeleteCommentMutation,
  ]);

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash:
        gaslessDeleteCommentMutation.data ||
        deleteCommentUsingApprovalMutation.data,
    });

  useEffect(() => {
    if (receipt?.status === "success") {
      onDeleteRef.current?.(comment.id);
    }
  }, [receipt?.status, onDeleteRef, comment.id]);

  const isAuthor =
    address && comment.author
      ? getAddress(address) === getAddress(comment.author.address)
      : false;

  const isDeleting =
    gaslessDeleteCommentMutation.isPending ||
    deleteCommentUsingApprovalMutation.isPending ||
    isReceiptLoading;

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
                onClick={handleDeleteComment}
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
      {"replies" in comment &&
        comment.replies.results?.map((reply) => (
          <CommentGasless
            key={reply.id}
            comment={reply}
            onReply={onReply}
            submitIfApproved={submitIfApproved}
          />
        ))}
    </div>
  );
}
