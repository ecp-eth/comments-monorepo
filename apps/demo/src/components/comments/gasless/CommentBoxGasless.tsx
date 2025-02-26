import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useMutation } from "@tanstack/react-query";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { useFreshRef } from "@/lib/hooks";
import {
  type PrepareSignedGaslessCommentRequestBodySchemaType,
  type PreparedGaslessCommentOperationApprovedSchemaType,
  PreparedGaslessCommentOperationApprovedResponseSchema,
  GaslessPostCommentResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedSchemaType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import type { SignTypedDataParameters } from "viem";
import { bigintReplacer } from "@/lib/utils";

async function prepareSignedGaslessComment(
  submitIfApproved: true,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<PreparedGaslessCommentOperationApprovedSchemaType>;
async function prepareSignedGaslessComment(
  submitIfApproved: false,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<PreparedSignedGaslessPostCommentNotApprovedSchemaType>;

async function prepareSignedGaslessComment(
  submitIfApproved: boolean,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<
  | PreparedGaslessCommentOperationApprovedSchemaType
  | PreparedSignedGaslessPostCommentNotApprovedSchemaType
> {
  const response = await fetch("/api/sign-comment/gasless/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      submitIfApproved,
    } satisfies PrepareSignedGaslessCommentRequestBodySchemaType),
  });

  if (!response.ok) {
    throw new Error("Failed to sign comment");
  }

  const data = await response.json();

  if (submitIfApproved) {
    return PreparedGaslessCommentOperationApprovedResponseSchema.parse(data);
  }

  return PreparedSignedGaslessPostCommentNotApprovedResponseSchema.parse(data);
}

interface CommentBoxProps {
  isApproved?: boolean;
  onSubmit: () => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBoxGasless({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
  isApproved = false,
}: CommentBoxProps) {
  const onSubmitRef = useFreshRef(onSubmit);
  const { address } = useAccount();
  const [content, setContent] = useState("");

  const prepareApprovedCommentMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("No address");
      }

      return prepareSignedGaslessComment(true, {
        content,
        targetUri: window.location.href,
        parentId,
        author: address,
      });
    },
  });

  // TODO: Add mutation for approval flow
  const gaslessSubmitMutation = useGaslessTransaction({
    async prepareSignTypedDataParams() {
      if (!address) {
        throw new Error("No address");
      }

      const data = await prepareSignedGaslessComment(false, {
        content,
        targetUri: window.location.href,
        parentId,
        author: address,
      });

      return {
        signTypedDataParams:
          data.signTypedDataParams as unknown as SignTypedDataParameters,
        variables: data,
      } satisfies {
        signTypedDataParams: SignTypedDataParameters;
        variables: PreparedSignedGaslessPostCommentNotApprovedSchemaType;
      };
    },
    async sendSignedData({ signature, variables }) {
      const response = await fetch("/api/sign-comment/gasless", {
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
        throw new Error("Failed to post comment");
      }

      const data = GaslessPostCommentResponseSchema.parse(
        await response.json()
      );

      return data.txHash;
    },
  });

  const pendingTxHash =
    gaslessSubmitMutation.data || prepareApprovedCommentMutation.data?.txHash;

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: pendingTxHash,
    });

  const submitMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !address) {
        return;
      }

      if (isApproved) {
        await prepareApprovedCommentMutation.mutateAsync();
      } else {
        await gaslessSubmitMutation.mutateAsync();
      }
    },
  });

  useEffect(() => {
    if (receipt?.status === "success") {
      toast.success("Comment posted");
      onSubmitRef.current?.();
      setContent("");
    }
  }, [receipt?.status, onSubmitRef]);

  const isPending =
    gaslessSubmitMutation.isPending || prepareApprovedCommentMutation.isPending;

  const isLoading = isReceiptLoading || isPending;

  return (
    <form onSubmit={submitMutation.mutate} className="mb-4 flex flex-col gap-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded"
        disabled={isLoading}
      />
      {address && (
        <div className="text-xs text-gray-500">Publishing as {address}</div>
      )}
      <div className="flex items-center text-sm text-gray-500">
        <Button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isLoading || !content.trim() || !address}
        >
          {isLoading ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
