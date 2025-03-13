import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { bigintReplacer } from "@/lib/utils";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { MoreVertical } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getAddress, SignTypedDataParameters } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { CommentBoxGasless } from "./CommentBoxGasless";
import type { CommentType } from "@/lib/types";
import { useFreshRef } from "@/hooks/useFreshRef";
import {
  DeleteCommentResponseSchema,
  PendingCommentOperationSchemaType,
  PreparedSignedGaslessDeleteCommentApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema,
  PreparedSignedGaslessDeleteCommentNotApprovedSchemaType,
  PrepareGaslessDeleteCommentOperationResponseSchema,
  PrepareGaslessDeleteCommentOperationResponseSchemaType,
  type PrepareGaslessCommentDeletionRequestBodySchemaType,
} from "@/lib/schemas";
import { useMutation } from "@tanstack/react-query";
import useEnrichedAuthor from "@/hooks/useEnrichedAuthor";
import { Hex } from "@ecp.eth/sdk/schemas";
import { publicEnv } from "@/publicEnv";
import { CommentAuthor } from "../CommentAuthor";

async function gaslessDeleteComment(
  params: PrepareGaslessCommentDeletionRequestBodySchemaType
): Promise<PrepareGaslessDeleteCommentOperationResponseSchemaType> {
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

  return PrepareGaslessDeleteCommentOperationResponseSchema.parse(
    await response.json()
  );
}

interface CommentProps {
  isAppSignerApproved: boolean;
  comment: CommentType;
  onReply?: (
    pendingCommentOperation: PendingCommentOperationSchemaType
  ) => void;
  onDelete?: (id: Hex) => void;
  level?: number;
}

export function CommentGasless({
  comment,
  onReply,
  onDelete,
  isAppSignerApproved: submitIfApproved,
  level = 0,
}: CommentProps) {
  const { address: connectedAddress } = useAccount();
  const [isReplying, setIsReplying] = useState(false);
  const onDeleteRef = useFreshRef(onDelete);
  const enrichedAuthor = useEnrichedAuthor(comment.author);

  const handleReply = (
    pendingCommentOperation: PendingCommentOperationSchemaType
  ) => {
    onReply?.(pendingCommentOperation);
    setIsReplying(false);
  };

  // delete a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const deletePriorApprovedCommentMutation = useMutation({
    mutationFn: async () => {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      if (!submitIfApproved) {
        throw new Error("Not approved");
      }

      const result = await gaslessDeleteComment({
        author: connectedAddress,
        commentId: comment.id,
        submitIfApproved: true,
      });

      return PreparedSignedGaslessDeleteCommentApprovedResponseSchema.parse(
        result
      ).txHash;
    },
  });

  // delete a comment that was previously NOT approved,
  // will require user interaction for signature
  const deletePriorNotApprovedCommentMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!connectedAddress) {
        throw new Error("No address found");
      }

      const result = await gaslessDeleteComment({
        author: connectedAddress,
        commentId: comment.id,
        submitIfApproved: false,
      });

      const data =
        PreparedSignedGaslessDeleteCommentNotApprovedResponseSchema.parse(
          result
        );

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessDeleteCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/delete-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          {
            ...variables,
            authorSignature: signature,
          },
          bigintReplacer // because typed data contains a bigint when parsed using our zod schemas
        ),
      });

      if (!response.ok) {
        throw new Error("Failed to post approval signature");
      }

      const data = DeleteCommentResponseSchema.parse(await response.json());

      return data.txHash;
    },
  });

  const handleDeleteComment = useCallback(() => {
    if (submitIfApproved) {
      deletePriorApprovedCommentMutation.mutate();
    } else {
      deletePriorNotApprovedCommentMutation.mutate();
    }
  }, [
    submitIfApproved,
    deletePriorApprovedCommentMutation,
    deletePriorNotApprovedCommentMutation,
  ]);

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash:
        deletePriorNotApprovedCommentMutation.data ||
        deletePriorApprovedCommentMutation.data,
    });

  useEffect(() => {
    if (receipt?.status === "success") {
      onDeleteRef.current?.(comment.id);
    }
  }, [receipt?.status, onDeleteRef, comment.id]);

  const isAuthor = connectedAddress
    ? getAddress(connectedAddress) === getAddress(enrichedAuthor.address)
    : false;

  const isDeleting =
    deletePriorNotApprovedCommentMutation.isPending ||
    deletePriorApprovedCommentMutation.isPending ||
    isReceiptLoading;

  return (
    <div className="mb-4 border-l-2 border-gray-200 pl-4">
      <div className="flex justify-between items-center">
        <CommentAuthor author={enrichedAuthor} timestamp={comment.timestamp} />
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
      {connectedAddress && (
        <div className="text-xs text-gray-500 mb-2">
          <button
            onClick={() => setIsReplying(!isReplying)}
            className="mr-2 hover:underline"
          >
            reply
          </button>
        </div>
      )}
      {isReplying && (
        <CommentBoxGasless
          onSubmit={handleReply}
          placeholder="What are your thoughts?"
          parentId={
            level >= publicEnv.NEXT_PUBLIC_REPLY_DEPTH_CUTOFF &&
            comment.parentId
              ? comment.parentId
              : comment.id
          }
          isAppSignerApproved={submitIfApproved}
        />
      )}
      {"replies" in comment &&
        comment.replies.results?.map((reply) => (
          <CommentGasless
            key={reply.id}
            comment={reply}
            onReply={onReply}
            onDelete={onDelete}
            isAppSignerApproved={submitIfApproved}
            level={level + 1}
          />
        ))}
    </div>
  );
}
