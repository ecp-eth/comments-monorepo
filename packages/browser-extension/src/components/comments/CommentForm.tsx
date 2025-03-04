import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { CommentsV1Abi } from "@ecp.eth/sdk/abis";
import { chains } from "@/lib/wagmi";
import { COMMENTS_V1_ADDRESS } from "@ecp.eth/sdk";
import { useFreshRef } from "@/hooks/useFreshRef";
import type { PendingCommentOperationSchemaType } from "@/lib/schemas";
import type { Hex } from "@ecp.eth/sdk/schemas";
import { cn } from "@/lib/utils";
import {
  submitCommentMutationFunction,
  SubmitCommentMutationValidationError,
} from "./queries";
import { MAX_COMMENT_LENGTH } from "@/lib/constants";
import { useCommentsContext } from "@/providers/comments-provider";

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
  const { targetUri } = useCommentsContext();
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
  const trimmedContent = content.trim();
  const isContentValid =
    trimmedContent.length > 0 && trimmedContent.length <= MAX_COMMENT_LENGTH;

  return (
    <form
      onSubmit={submitCommentMutation.mutate}
      className={cn("flex flex-col gap-2", !address && "opacity-20")}
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
            "border-destructive focus-visible:border-destructive"
        )}
        disabled={isSubmitting}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <div className="flex gap-2 justify-between">
        <div className="flex-grow text-xs text-muted-foreground truncate">
          {address && <>Publishing as {address}</>}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || !address || !isContentValid}
          size="sm"
        >
          {isSubmitting ? "Posting..." : "Comment"}
        </Button>
      </div>
      {submitCommentMutation.error && (
        <div className="text-xs text-destructive">
          {submitCommentMutation.error.message}
        </div>
      )}
    </form>
  );
}
