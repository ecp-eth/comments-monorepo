import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useMutation } from "@tanstack/react-query";
import { useGaslessTransaction } from "@ecp.eth/sdk/react";
import { useFreshRef } from "@/hooks/useFreshRef";
import {
  type PrepareSignedGaslessCommentRequestBodySchemaType,
  type PreparedGaslessPostCommentOperationApprovedSchemaType,
  PreparedGaslessPostCommentOperationApprovedResponseSchema,
  GaslessPostCommentResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedResponseSchema,
  PreparedSignedGaslessPostCommentNotApprovedSchemaType,
  PendingCommentOperationSchemaType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import type { SignTypedDataParameters } from "viem";
import { bigintReplacer } from "@/lib/utils";
import { chain } from "@/lib/wagmi";
import { CommentBoxAuthor } from "../CommentBoxAuthor";

const chainId = chain.id;

async function prepareSignedGaslessComment(
  submitIfApproved: true,
  body: Omit<
    PrepareSignedGaslessCommentRequestBodySchemaType,
    "submitIfApproved"
  >
): Promise<PreparedGaslessPostCommentOperationApprovedSchemaType>;
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
  | PreparedGaslessPostCommentOperationApprovedSchemaType
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
    return PreparedGaslessPostCommentOperationApprovedResponseSchema.parse(data);
  }

  return PreparedSignedGaslessPostCommentNotApprovedResponseSchema.parse(data);
}

interface CommentBoxProps {
  isAppSignerApproved?: boolean;
  onSubmit: (pendingComment: PendingCommentOperationSchemaType) => void;
  placeholder?: string;
  parentId?: Hex;
}

export function CommentBoxGasless({
  onSubmit,
  placeholder = "What are your thoughts?",
  parentId,
  isAppSignerApproved: isApproved = false,
}: CommentBoxProps) {
  const onSubmitRef = useFreshRef(onSubmit);
  const { address } = useAccount();
  const [content, setContent] = useState("");

  // post a comment that was previously approved, so not need for
  // user approval for signature for each interaction
  const postPriorApprovedCommentMutation = useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("No address");
      }

      return prepareSignedGaslessComment(
        // tell the server to submit right away after preparation of the comment data,
        // if the app is previously approved
        true,
        {
          content,
          targetUri: window.location.href,
          parentId,
          author: address,
        }
      );
    },
  });

  // post a comment that was previously NOT approved,
  // will require user interaction for signature
  const postPriorNotApprovedSubmitMutation = useGaslessTransaction({
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

      const { txHash} = GaslessPostCommentResponseSchema.parse(
        await response.json()
      );

      return {
        txHash,
        ...variables,
      };
    },
  });

  // consolidated mutation for both prior approved or non approved (also gasless) comments
  const submitMutation = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();

      if (!content.trim() || !address) {
        return;
      }

      return isApproved
        ? await postPriorApprovedCommentMutation.mutateAsync()
        : await postPriorNotApprovedSubmitMutation.mutateAsync();
    },
  });

  const { data: receipt, isLoading: isReceiptLoading } =
    useWaitForTransactionReceipt({
      hash: submitMutation.data?.txHash,
    });

  useEffect(() => {
    const submitMutationData = submitMutation.data;

    if (!submitMutationData || receipt?.status === "success") {
      return;
    }

    toast.success("Comment posted");
    onSubmitRef.current?.({
      chainId,
      txHash: submitMutationData.txHash,
      response: {
        signature: submitMutationData.appSignature,
        hash: submitMutationData.id,
        data: submitMutationData.commentData,
      },
    });
    setContent("");
  }, [receipt?.status, onSubmitRef, submitMutation.data]);

  const isPending =
    postPriorNotApprovedSubmitMutation.isPending ||
    postPriorApprovedCommentMutation.isPending;

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
      {address && <CommentBoxAuthor address={address} />}
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
