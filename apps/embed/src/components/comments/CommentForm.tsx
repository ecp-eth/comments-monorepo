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
import type { PendingCommentOperationSchemaType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { cn } from "@/lib/utils";
import {
  submitCommentMutationFunction,
  SubmitCommentMutationValidationError,
} from "./queries";

export type OnSubmitSuccessFunction = (
  params: PendingCommentOperationSchemaType
) => void;

interface CommentBoxProps {
  /**
   * Called when user blurred text area with empty content
   */
  onLeftEmpty?: () => void;
  onSubmitSuccess: OnSubmitSuccessFunction;
  placeholder?: string;
  parentId?: Hex;
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
    ): Promise<PendingCommentOperationSchemaType> => {
      e.preventDefault();

      return submitCommentMutationFunction({
        address,
        commentRequest: {
          chainId: chains[0].id,
          content,
          targetUri,
          parentId,
        },
        switchChainAsync(chainId) {
          return switchChainAsync({ chainId });
        },
        writeContractAsync(params) {
          return postCommentContract.writeContractAsync({
            abi: CommentsV1Abi,
            address: COMMENTS_V1_ADDRESS,
            functionName: "postCommentAsAuthor",
            args: [params.data, params.signature],
          });
        },
      });
    },
    onSuccess(params) {
      setContent("");
      submitCommentMutation.reset();
      onSubmitSuccessRef.current(params);
    },
  });

  useEffect(() => {
    if (
      submitCommentMutation.error instanceof
      SubmitCommentMutationValidationError
    ) {
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
          "w-full p-2",
          submitCommentMutation.error &&
            submitCommentMutation.error instanceof
              SubmitCommentMutationValidationError &&
            "border-destructive focus-visible:ring-destructive"
        )}
        disabled={isSubmitting}
      />
      {address && (
        <div className="text-xs text-muted-foreground">
          Publishing as {address}
        </div>
      )}
      {submitCommentMutation.error && (
        <div className="text-xs text-destructive">
          {submitCommentMutation.error.message}
        </div>
      )}
      <div className="flex items-center text-muted-foreground">
        <Button
          type="submit"
          disabled={isSubmitting || !address || !content.trim()}
          size="sm"
        >
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
    </form>
  );
}
