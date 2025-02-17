import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { chains } from "../../lib/wagmi";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { useFreshRef } from "@/hooks/useFreshRef";
import { useEmbedConfig } from "../EmbedConfigProvider";
import {
  SignCommentResponseClientSchema,
  SignCommentResponseClientSchemaType,
} from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { cn } from "@/lib/utils";
import { ContractFunctionExecutionError } from "viem";

class CommentFormError extends Error {}

class CommentFormValidationError extends Error {}

export type CommentFormSubmitSuccessParams = {
  response: SignCommentResponseClientSchemaType;
  txHash: Hex;
  chainId: number;
};

export type OnSubmitSuccessFunction = (
  params: CommentFormSubmitSuccessParams
) => void;

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: string;
}

interface SignCommentRequest {
  content: string;
  targetUri?: string;
  parentId?: string;
  chainId: number;
  author: `0x${string}`;
}

export function CommentForm({
  onLeftEmpty,
  onSubmitSuccess,
  placeholder = "What are your thoughts?",
  parentId,
}: CommentBoxProps) {
  const { targetUri } = useEmbedConfig();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const onSubmitSuccessRef = useFreshRef(onSubmitSuccess);
  const { address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [content, setContent] = useState("");

  const postCommentContract = useWriteContract();

  const submitCommentMutation = useMutation({
    mutationFn: async (
      e: React.FormEvent
    ): Promise<CommentFormSubmitSuccessParams> => {
      e.preventDefault();

      if (!address) {
        throw new CommentFormError("Wallet not connected.");
      }

      if (!content.trim()) {
        throw new CommentFormValidationError("Comment cannot be empty.");
      }

      const chain = await switchChainAsync({ chainId: chains[0].id });

      const response = await fetch("/api/sign-comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          targetUri,
          parentId,
          author: address,
          chainId: chain.id,
        } satisfies SignCommentRequest),
      });

      if (!response.ok) {
        throw new CommentFormError(
          "Failed to obtain signed comment data, please try again."
        );
      }

      const signedCommentResult = SignCommentResponseClientSchema.safeParse(
        await response.json()
      );

      if (!signedCommentResult.success) {
        throw new CommentFormError(
          "Server returned malformed signed comment data, please try again."
        );
      }

      try {
        const txHash = await postCommentContract.writeContractAsync({
          abi: CommentsV1Abi,
          address: COMMENTS_V1_ADDRESS,
          functionName: "postCommentAsAuthor",
          args: [
            signedCommentResult.data.data,
            signedCommentResult.data.signature,
          ],
        });

        return {
          response: signedCommentResult.data,
          txHash,
          chainId: chain.id,
        };
      } catch (e) {
        if (
          e instanceof ContractFunctionExecutionError &&
          e.shortMessage.includes("User rejected the request.")
        ) {
          throw new CommentFormError(
            "Could not post the comment because the transaction was rejected."
          );
        }

        console.error(e);

        throw new CommentFormError("Failed to post comment, please try again.");
      }
    },
    onSuccess(params) {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current(params);
    },
  });

  /* const signCommentMutationDataRef = useFreshRef(signCommentMutation.data);

  useEffect(() => {
    if (postCommentTxReceipt.data?.status === "success") {
      toast.success("Comment posted");
      onSubmitSuccessRef.current(signCommentMutationDataRef.current, {
        txHash: postCommentTxReceipt.data.transactionHash,
        chainId: postCommentTxReceipt.data.chainId,
      });
      postCommentContract.reset();
      setContent("");
    }
  }, [
    onSubmitSuccessRef,
    postCommentContract,
    postCommentTxReceipt.data?.chainId,
    postCommentTxReceipt.data?.status,
    postCommentTxReceipt.data?.transactionHash,
    signCommentMutationDataRef,
  ]);*/

  /* const isLoading =
    postCommentContract.isPending ||
    postCommentTxReceipt.isFetching ||
    signCommentMutation.isPending;*/

  useEffect(() => {
    if (submitCommentMutation.error instanceof CommentFormValidationError) {
      textAreaRef.current?.focus();
    }
  }, [submitCommentMutation.error]);

  const isSubmitting = submitCommentMutation.isPending;

  return (
    <form
      onSubmit={submitCommentMutation.mutate}
      className="flex flex-col gap-2"
    >
      <Textarea
        onBlur={() => {
          if (!content && !isSubmitting) {
            onLeftEmpty?.();
          }
        }}
        ref={textAreaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full p-2 border border-gray-300 rounded",
          submitCommentMutation.error &&
            submitCommentMutation.error instanceof CommentFormValidationError &&
            "border-red-500 focus-visible:ring-red-500"
        )}
        disabled={isSubmitting}
      />
      {address && (
        <div className="text-xs text-gray-500">Publishing as {address}</div>
      )}
      {submitCommentMutation.error && (
        <div className="text-xs text-red-500">
          {submitCommentMutation.error.message}
        </div>
      )}
      <div className="flex items-center text-sm text-gray-500">
        <Button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={isSubmitting || !address || !content.trim()}
        >
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
